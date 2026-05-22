"use server";

import { cookies } from "next/headers";
import prisma from "@/lib/db";
import { hashPassword, generateTicketNumber, calculateParkingFee } from "@/lib/utils";

// -----------------------------------------------------------------------------
// Authentication Actions
// -----------------------------------------------------------------------------

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  try {
    return JSON.parse(session.value) as {
      userId: string;
      name: string;
      email: string;
      role: string;
      tenantId: string;
      tenantSlug: string;
    };
  } catch {
    return null;
  }
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  return { success: true };
}

export async function loginUser(email: string, passwordPlain: string, tenantSlug: string) {
  try {
    const hashed = hashPassword(passwordPlain);
    
    // Find tenant by slug
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      return { success: false, error: "Company workspace not found." };
    }

    // Find user inside that tenant
    const user = await prisma.user.findFirst({
      where: {
        email,
        passwordHash: hashed,
        tenantId: tenant.id,
      },
    });

    if (!user) {
      return { success: false, error: "Invalid email or password." };
    }

    const sessionData = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    };

    const cookieStore = await cookies();
    cookieStore.set("session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });

    return { success: true, user: sessionData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function registerTenant(
  companyName: string,
  slug: string,
  adminName: string,
  adminEmail: string,
  adminPasswordPlain: string
) {
  try {
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    
    // Check if slug is taken
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: cleanSlug },
    });
    if (existingTenant) {
      return { success: false, error: "Slug is already taken by another company." };
    }

    // Check if admin email is globally unique
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (existingUser) {
      return { success: false, error: "User email already registered." };
    }

    const hashed = hashPassword(adminPasswordPlain);

    // Create everything in a Prisma transaction to guarantee consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          slug: cleanSlug,
        },
      });

      // 2. Create Admin User
      const admin = await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          passwordHash: hashed,
          role: "ADMIN",
          tenantId: tenant.id,
        },
      });

      // 3. Create Pricing Rules (Defaults)
      const vehicleTypes = ["SMALL", "MEDIUM", "LARGE", "EV"];
      const pricingData = {
        SMALL: { baseRate: 2.0, hourlyRate: 1.0 },
        MEDIUM: { baseRate: 4.0, hourlyRate: 2.0 },
        LARGE: { baseRate: 7.0, hourlyRate: 3.5 },
        EV: { baseRate: 5.5, hourlyRate: 2.5 },
      };

      for (const type of vehicleTypes) {
        const rate = pricingData[type as keyof typeof pricingData];
        await tx.pricingRule.create({
          data: {
            vehicleType: type,
            baseRate: rate.baseRate,
            hourlyRate: rate.hourlyRate,
            peakMultiplier: 1.0,
            tenantId: tenant.id,
          },
        });
      }

      // 4. Create ParkingLot, Floor, and 5 default Slots
      const lot = await tx.parkingLot.create({
        data: {
          name: `${companyName} Garage`,
          location: "Primary Campus Lot A",
          tenantId: tenant.id,
        },
      });

      const floor = await tx.parkingFloor.create({
        data: {
          floorNumber: 1,
          parkingLotId: lot.id,
        },
      });

      const defaultSlots = [
        { number: "P-01", type: "SMALL" },
        { number: "P-02", type: "MEDIUM" },
        { number: "P-03", type: "MEDIUM" },
        { number: "P-04", type: "LARGE" },
        { number: "P-05", type: "EV" },
      ];

      for (const s of defaultSlots) {
        await tx.parkingSlot.create({
          data: {
            slotNumber: s.number,
            slotType: s.type,
            status: "AVAILABLE",
            floorId: floor.id,
          },
        });
      }

      return { tenant, admin };
    });

    // Automatically log user in upon registration
    const sessionData = {
      userId: result.admin.id,
      name: result.admin.name,
      email: result.admin.email,
      role: "ADMIN",
      tenantId: result.tenant.id,
      tenantSlug: result.tenant.slug,
    };

    const cookieStore = await cookies();
    cookieStore.set("session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return { success: true, tenantSlug: result.tenant.slug };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// -----------------------------------------------------------------------------
// Attendant Gate Actions
// -----------------------------------------------------------------------------

export async function checkInVehicle(
  tenantId: string,
  vehicleNumber: string,
  vehicleType: string,
  attendantId: string
) {
  try {
    // 1. Find an available slot.
    // Try to find the exact match first
    let slot = await prisma.parkingSlot.findFirst({
      where: {
        status: "AVAILABLE",
        slotType: vehicleType,
        floor: {
          parkingLot: {
            tenantId,
          },
        },
      },
      orderBy: { slotNumber: "asc" },
    });

    // If no exact match, fallback to any available slot that can fit this vehicle type
    if (!slot) {
      // SMALL fits in small, medium, large. MEDIUM in medium, large. LARGE in large. EV in EV.
      const fallbackTypes = 
        vehicleType === "SMALL" ? ["SMALL", "MEDIUM", "LARGE"] :
        vehicleType === "MEDIUM" ? ["MEDIUM", "LARGE"] : 
        [vehicleType]; // LARGE or EV only fits in respective slot type

      slot = await prisma.parkingSlot.findFirst({
        where: {
          status: "AVAILABLE",
          slotType: { in: fallbackTypes },
          floor: {
            parkingLot: {
              tenantId,
            },
          },
        },
        orderBy: { slotNumber: "asc" },
      });
    }

    if (!slot) {
      return { success: false, error: `No available slots remaining for ${vehicleType} size.` };
    }

    const ticketNumber = generateTicketNumber();

    // 2. Transact check-in
    const ticket = await prisma.$transaction(async (tx) => {
      // Mark slot as OCCUPIED
      await tx.parkingSlot.update({
        where: { id: slot.id },
        data: { status: "OCCUPIED" },
      });

      // Create Active Ticket
      return await tx.ticket.create({
        data: {
          ticketNumber,
          vehicleNumber: vehicleNumber.toUpperCase().trim(),
          vehicleType,
          entryTime: new Date(),
          status: "ACTIVE",
          paymentStatus: "PENDING",
          slotId: slot.id,
          tenantId,
          attendantId,
        },
        include: {
          slot: {
            include: {
              floor: {
                include: { parkingLot: true }
              }
            }
          }
        }
      });
    });

    return { success: true, ticket };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function searchActiveTicket(tenantId: string, query: string) {
  try {
    const cleanQuery = query.toUpperCase().trim();
    const ticket = await prisma.ticket.findFirst({
      where: {
        tenantId,
        status: "ACTIVE",
        OR: [
          { ticketNumber: cleanQuery },
          { vehicleNumber: cleanQuery },
        ],
      },
      include: {
        slot: {
          include: {
            floor: true
          }
        }
      },
    });

    if (!ticket) {
      return { success: false, error: "No active ticket found for plate or ticket number." };
    }

    // Get pricing rules to calculate preview fee
    const pricingRules = await prisma.pricingRule.findMany({
      where: { tenantId },
    });

    const feeDetails = calculateParkingFee(
      ticket.entryTime,
      new Date(),
      pricingRules,
      ticket.vehicleType
    );

    return {
      success: true,
      ticket,
      feeDetails,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function processCheckOut(
  ticketId: string,
  paymentMethod: string,
  attendantId: string,
  tenantId: string
) {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket || ticket.status !== "ACTIVE" || ticket.tenantId !== tenantId) {
      return { success: false, error: "Ticket not found or already checked out." };
    }

    const pricingRules = await prisma.pricingRule.findMany({
      where: { tenantId },
    });

    const exitTime = new Date();
    const feeDetails = calculateParkingFee(
      ticket.entryTime,
      exitTime,
      pricingRules,
      ticket.vehicleType
    );

    // Finalize invoice transactions
    await prisma.$transaction(async (tx) => {
      // Mark slot back to AVAILABLE
      await tx.parkingSlot.update({
        where: { id: ticket.slotId },
        data: { status: "AVAILABLE" },
      });

      // Update Ticket with checkout timestamp and fee details
      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          exitTime,
          status: "PAID",
          totalFee: feeDetails.totalFee,
          paymentStatus: "PAID",
          paymentMethod,
          exitAttendantId: attendantId,
        },
      });
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// -----------------------------------------------------------------------------
// Admin / Management Actions
// -----------------------------------------------------------------------------

export async function toggleSlotMaintenance(slotId: string, currentStatus: string) {
  try {
    const newStatus = currentStatus === "MAINTENANCE" ? "AVAILABLE" : "MAINTENANCE";
    await prisma.parkingSlot.update({
      where: { id: slotId },
      data: { status: newStatus },
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePricingRule(
  ruleId: string,
  baseRate: number,
  hourlyRate: number,
  peakMultiplier: number
) {
  try {
    await prisma.pricingRule.update({
      where: { id: ruleId },
      data: {
        baseRate,
        hourlyRate,
        peakMultiplier,
      },
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// -----------------------------------------------------------------------------
// Accounting & Report Aggregation Actions
// -----------------------------------------------------------------------------

export async function getEarningsReport(
  tenantId: string,
  rangeType: "daily" | "monthly" | "yearly",
  dateString: string // e.g. "2026-05-22", "2026-05", or "2026"
) {
  try {
    let start: Date;
    let end: Date;

    if (rangeType === "daily") {
      start = new Date(`${dateString}T00:00:00`);
      end = new Date(`${dateString}T23:59:59.999`);
    } else if (rangeType === "monthly") {
      const [year, month] = dateString.split("-");
      start = new Date(parseInt(year), parseInt(month) - 1, 1);
      end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    } else {
      const year = parseInt(dateString);
      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31, 23, 59, 59, 999);
    }

    // Query paid tickets in this window
    const tickets = await prisma.ticket.findMany({
      where: {
        tenantId,
        status: "PAID",
        exitTime: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { exitTime: "asc" },
    });

    // 1. Calculate Aggregations
    let totalRevenue = 0;
    const vehicleBreakdown: Record<string, { revenue: number; count: number }> = {
      SMALL: { revenue: 0, count: 0 },
      MEDIUM: { revenue: 0, count: 0 },
      LARGE: { revenue: 0, count: 0 },
      EV: { revenue: 0, count: 0 },
    };
    const paymentBreakdown: Record<string, { revenue: number; count: number }> = {
      CASH: { revenue: 0, count: 0 },
      CARD: { revenue: 0, count: 0 },
      WALLET: { revenue: 0, count: 0 },
    };

    tickets.forEach((t) => {
      const fee = t.totalFee || 0;
      totalRevenue += fee;

      // Vehicle breakdown
      if (vehicleBreakdown[t.vehicleType]) {
        vehicleBreakdown[t.vehicleType].revenue += fee;
        vehicleBreakdown[t.vehicleType].count += 1;
      }

      // Payment breakdown
      const method = t.paymentMethod || "CASH";
      if (paymentBreakdown[method]) {
        paymentBreakdown[method].revenue += fee;
        paymentBreakdown[method].count += 1;
      }
    });

    return {
      success: true,
      rangeType,
      dateString,
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        ticketCount: tickets.length,
        averageFee: tickets.length > 0 ? parseFloat((totalRevenue / tickets.length).toFixed(2)) : 0,
      },
      vehicleBreakdown,
      paymentBreakdown,
      tickets: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        vehicleNumber: t.vehicleNumber,
        vehicleType: t.vehicleType,
        totalFee: t.totalFee,
        entryTime: t.entryTime,
        exitTime: t.exitTime,
        paymentMethod: t.paymentMethod,
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// -----------------------------------------------------------------------------
// Driver Portal / Reservation Actions
// -----------------------------------------------------------------------------

export async function createReservation(
  tenantId: string,
  customerId: string,
  slotId: string,
  startTime: Date,
  endTime: Date
) {
  try {
    // Check if slot has conflicting reservations
    const conflicting = await prisma.reservation.findFirst({
      where: {
        slotId,
        status: "CONFIRMED",
        OR: [
          {
            startTime: { lte: startTime },
            endTime: { gte: startTime },
          },
          {
            startTime: { lte: endTime },
            endTime: { gte: endTime },
          },
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
      },
    });

    if (conflicting) {
      return { success: false, error: "This slot is already reserved for the selected time window." };
    }

    const reservation = await prisma.reservation.create({
      data: {
        customerId,
        slotId,
        startTime,
        endTime,
        status: "CONFIRMED",
      },
    });

    return { success: true, reservation };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

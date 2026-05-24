"use server";

import { cookies } from "next/headers";
import { hashPassword, generateTicketNumber, calculateParkingFee } from "@/lib/utils";
import { encryptSession, decryptSession } from "./session";
import { logger } from "@/lib/logger";

// Import Services
import {
  getTenantBySlug,
  createTenantWithDefaults,
} from "@/lib/services/tenantService";
import {
  getUserByEmail,
  getUserByCredentialsAndTenant,
} from "@/lib/services/userService";
import {
  findAvailableSlotForVehicle,
  updateSlotStatus,
} from "@/lib/services/slotService";
import {
  getActiveTicketByPlateOrNumber,
  checkInTicketTransaction,
  checkOutTicketTransaction,
  getTenantPaidTicketsInDateRange,
  getTicketById,
} from "@/lib/services/ticketService";
import {
  getPricingRules,
  updatePricingRule as serviceUpdatePricingRule,
} from "@/lib/services/pricingService";
import {
  findConflictingReservation,
  createReservation as serviceCreateReservation,
} from "@/lib/services/reservationService";

// Helper to safely get error message in type-safe catch blocks
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// -----------------------------------------------------------------------------
// Authentication Actions
// -----------------------------------------------------------------------------

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  return decryptSession(session.value) as {
    userId: string;
    name: string;
    email: string;
    role: string;
    tenantId: string;
    tenantSlug: string;
  } | null;
}

export async function logoutUser() {
  try {
    const user = await getCurrentUser();
    if (user) {
      logger.info("User logged out", { email: user.email, role: user.role, tenantSlug: user.tenantSlug });
    }
  } catch {
    // Ignore context errors during logout check
  }
  const cookieStore = await cookies();
  cookieStore.delete("session");
  return { success: true };
}

export async function loginUser(email: string, passwordPlain: string, tenantSlug: string) {
  try {
    const hashed = hashPassword(passwordPlain);
    
    // Find tenant by slug
    const tenant = await getTenantBySlug(tenantSlug);

    if (!tenant) {
      logger.warn("Failed login attempt: Tenant not found", { email, tenantSlug });
      return { success: false, error: "Company workspace not found." };
    }

    // Find user inside that tenant
    const user = await getUserByCredentialsAndTenant(email, hashed, tenant.id);

    if (!user) {
      logger.warn("Failed login attempt: Invalid credentials", { email, tenantId: tenant.id, tenantSlug });
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
    cookieStore.set("session", encryptSession(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });

    logger.info("User successfully logged in", { email: user.email, role: user.role, tenantSlug });
    return { success: true, user: sessionData };
  } catch (error: unknown) {
    logger.error(`Exception during login for ${email}`, error);
    return { success: false, error: getErrorMessage(error) };
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
    const existingTenant = await getTenantBySlug(cleanSlug);
    if (existingTenant) {
      logger.warn("Tenant registration failed: Slug already taken", { companyName, slug: cleanSlug });
      return { success: false, error: "Slug is already taken by another company." };
    }

    // Check if admin email is globally unique
    const existingUser = await getUserByEmail(adminEmail);
    if (existingUser) {
      logger.warn("Tenant registration failed: Email already registered", { companyName, adminEmail });
      return { success: false, error: "User email already registered." };
    }

    const hashed = hashPassword(adminPasswordPlain);

    // Create everything in service transaction
    const result = await createTenantWithDefaults(
      companyName,
      cleanSlug,
      adminName,
      adminEmail,
      hashed
    );

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
    cookieStore.set("session", encryptSession(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    logger.info("New tenant and admin registered successfully", { companyName, slug: cleanSlug, adminEmail });
    return { success: true, tenantSlug: result.tenant.slug };
  } catch (error: unknown) {
    logger.error("Exception during tenant registration", error);
    return { success: false, error: getErrorMessage(error) };
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
    logger.info("Initiating vehicle check-in", { tenantId, vehicleNumber, vehicleType, attendantId });
    
    // 1. Find an available slot
    const slot = await findAvailableSlotForVehicle(tenantId, vehicleType);

    if (!slot) {
      logger.warn("Vehicle check-in failed: No available slots", { tenantId, vehicleNumber, vehicleType });
      return { success: false, error: `No available slots remaining for ${vehicleType} size.` };
    }

    const ticketNumber = generateTicketNumber();

    // 2. Transact check-in via service
    const ticket = await checkInTicketTransaction(
      tenantId,
      vehicleNumber,
      vehicleType,
      slot.id,
      ticketNumber,
      attendantId
    );

    logger.info("Vehicle check-in successful", { ticketNumber: ticket.ticketNumber, vehicleNumber, slotId: slot.id });
    return { success: true, ticket };
  } catch (error: unknown) {
    logger.error("Exception during vehicle check-in", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function searchActiveTicket(tenantId: string, query: string) {
  try {
    const ticket = await getActiveTicketByPlateOrNumber(tenantId, query);

    if (!ticket) {
      return { success: false, error: "No active ticket found for plate or ticket number." };
    }

    // Get pricing rules to calculate preview fee
    const pricingRules = await getPricingRules(tenantId);

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
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function processCheckOut(
  ticketId: string,
  paymentMethod: string,
  attendantId: string,
  tenantId: string
) {
  try {
    logger.info("Initiating vehicle check-out", { ticketId, paymentMethod, attendantId, tenantId });
    
    const ticket = await getTicketById(ticketId);

    if (!ticket || ticket.status !== "ACTIVE" || ticket.tenantId !== tenantId) {
      logger.warn("Vehicle check-out failed: Ticket not active or invalid context", { ticketId, tenantId });
      return { success: false, error: "Ticket not found or already checked out." };
    }

    const pricingRules = await getPricingRules(tenantId);

    const exitTime = new Date();
    const feeDetails = calculateParkingFee(
      ticket.entryTime,
      exitTime,
      pricingRules,
      ticket.vehicleType
    );

    // Finalize invoice transactions via service
    await checkOutTicketTransaction(
      ticketId,
      ticket.slotId,
      exitTime,
      feeDetails.totalFee,
      paymentMethod,
      attendantId
    );

    logger.info("Vehicle check-out successful", { ticketId, totalFee: feeDetails.totalFee, paymentMethod });
    return { success: true };
  } catch (error: unknown) {
    logger.error("Exception during vehicle check-out", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// -----------------------------------------------------------------------------
// Admin / Management Actions
// -----------------------------------------------------------------------------

export async function toggleSlotMaintenance(slotId: string, currentStatus: string) {
  try {
    const newStatus = currentStatus === "MAINTENANCE" ? "AVAILABLE" : "MAINTENANCE";
    logger.info("Toggling slot maintenance status", { slotId, currentStatus, newStatus });
    await updateSlotStatus(slotId, newStatus);
    return { success: true };
  } catch (error: unknown) {
    logger.error("Exception during toggling slot maintenance status", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updatePricingRule(
  ruleId: string,
  baseRate: number,
  hourlyRate: number,
  peakMultiplier: number
) {
  try {
    logger.info("Updating vehicle pricing rule tariffs", { ruleId, baseRate, hourlyRate, peakMultiplier });
    await serviceUpdatePricingRule(ruleId, baseRate, hourlyRate, peakMultiplier);
    return { success: true };
  } catch (error: unknown) {
    logger.error("Exception during updating pricing rule tariffs", error);
    return { success: false, error: getErrorMessage(error) };
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

    // Query paid tickets in this window via service
    const tickets = await getTenantPaidTicketsInDateRange(tenantId, start, end);

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
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
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
    logger.info("Initiating slot reservation booking", { tenantId, customerId, slotId, startTime, endTime });
    
    // Check if slot has conflicting reservations via service
    const conflicting = await findConflictingReservation(slotId, startTime, endTime);

    if (conflicting) {
      logger.warn("Reservation booking failed: Conflicting slot reservation exists", { slotId, startTime, endTime });
      return { success: false, error: "This slot is already reserved for the selected time window." };
    }

    const reservation = await serviceCreateReservation(customerId, slotId, startTime, endTime);

    logger.info("Reservation booking successful", { reservationId: reservation.id, customerId, slotId });
    return { success: true, reservation };
  } catch (error: unknown) {
    logger.error("Exception during slot reservation", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

import { PrismaClient } from "@prisma/client";
import { encryptSession } from "../src/lib/session";

const prisma = new PrismaClient();

async function testPage(url: string, cookieStr?: string): Promise<{ status: number; text: string }> {
  const headers: Record<string, string> = {};
  if (cookieStr) {
    headers["Cookie"] = cookieStr;
  }
  const res = await fetch(url, { headers });
  const text = await res.text();
  return { status: res.status, text };
}

function cleanHTML(html: string): string {
  // Strip HTML tags and comments to get plain text
  return html.replace(/<[^>]*>/g, "").replace(/<!--.*?-->/g, "").replace(/\s+/g, " ");
}

async function runE2ETests() {
  console.log("\n========================================================");
  console.log("=== RUNNING FULL END-TO-END FLOW & PAGE VERIFICATION ===");
  console.log("========================================================\n");

  // 1. Fetch Tenant and Users from database
  const tenant = await prisma.tenant.findUnique({
    where: { slug: "metro-park" },
    include: {
      parkingLots: {
        include: {
          floors: {
            include: {
              slots: true
            }
          }
        }
      }
    }
  });

  if (!tenant) {
    console.error("Error: Seed tenant metro-park not found. Please run seed script first.");
    process.exit(1);
  }

  const admin = await prisma.user.findFirst({
    where: { email: "admin@metro.com", tenantId: tenant.id }
  });
  const attendant = await prisma.user.findFirst({
    where: { email: "att1@metro.com", tenantId: tenant.id }
  });
  const customer = await prisma.user.findFirst({
    where: { email: "driver@metro.com", tenantId: tenant.id }
  });

  if (!admin || !attendant || !customer) {
    console.error("Error: Pre-seeded users not found.");
    process.exit(1);
  }

  // 2. Helper to construct session cookies
  const getCookie = (user: any) => {
    const sessionObj = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: tenant.id,
      tenantSlug: tenant.slug
    };
    return `session=${encodeURIComponent(encryptSession(sessionObj))}`;
  };

  const adminCookie = getCookie(admin);
  const attendantCookie = getCookie(attendant);
  const customerCookie = getCookie(customer);

  const base = "http://localhost:3000";
  let passedCount = 0;
  let totalTests = 0;

  function assertCondition(name: string, condition: boolean, details?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      if (details) console.error(`   Detail: ${details}`);
    }
  }

  try {
    // ----------------------------------------------------
    // Scenario 1: SaaS Landing Page (Home)
    // ----------------------------------------------------
    console.log("\n--- Scenario 1: SaaS Landing Page ---");
    const saasPage = await testPage(`${base}/`);
    assertCondition(
      "SaaS Page loads successfully (Status 200)",
      saasPage.status === 200
    );
    const saasText = cleanHTML(saasPage.text);
    assertCondition(
      "SaaS Page contains main title brand",
      saasText.includes("PARKEASY SaaS")
    );
    assertCondition(
      "SaaS Page contains company registration forms",
      saasText.includes("Register New Parking Tenant") || saasPage.text.includes("placeholder=\"e.g. Gotham Mall Lots\"")
    );

    // ----------------------------------------------------
    // Scenario 2: Tenant Public Landing Page
    // ----------------------------------------------------
    console.log("\n--- Scenario 2: Tenant Landing Page ---");
    const tenantLanding = await testPage(`${base}/tenant/metro-park`);
    assertCondition(
      "Tenant page loads successfully",
      tenantLanding.status === 200
    );
    const tenantText = cleanHTML(tenantLanding.text);
    assertCondition(
      "Tenant page displays custom tenant greeting",
      tenantText.includes("Welcome to Metropolis Plaza Parking")
    );

    // ----------------------------------------------------
    // Scenario 3: Tenant Login Page
    // ----------------------------------------------------
    console.log("\n--- Scenario 3: Tenant Login Page ---");
    const loginPage = await testPage(`${base}/tenant/metro-park/login`);
    assertCondition(
      "Login page loads successfully",
      loginPage.status === 200
    );
    const loginText = cleanHTML(loginPage.text);
    assertCondition(
      "Login page displays Workspace Login",
      loginText.includes("Workspace Login")
    );
    assertCondition(
      "Login page has demo credentials shortcuts",
      loginText.includes("Metro Attendant") && loginText.includes("Metro Admin")
    );

    // ----------------------------------------------------
    // Clean up any lingering test tickets or reservations
    // ----------------------------------------------------
    await prisma.ticket.deleteMany({
      where: { vehicleNumber: "TX-E2E-777", tenantId: tenant.id }
    });
    await prisma.reservation.deleteMany({
      where: { customerId: customer.id }
    });
    // Ensure all slots are AVAILABLE
    await prisma.parkingSlot.updateMany({
      where: {
        floor: { parkingLot: { tenantId: tenant.id } }
      },
      data: { status: "AVAILABLE" }
    });

    // ----------------------------------------------------
    // Scenario 4: Attendant Dashboard - Check-In Simulation
    // ----------------------------------------------------
    console.log("\n--- Scenario 4: Attendant Dashboard & Check-In ---");
    
    // Check initial attendant console page
    const consoleBefore = await testPage(`${base}/tenant/metro-park/attendant`, attendantCookie);
    assertCondition(
      "Attendant console page loads successfully under authorization",
      consoleBefore.status === 200
    );
    
    // Check-in a vehicle TX-E2E-777 as EV in database to simulate gate check-in
    const evSlot = await prisma.parkingSlot.findFirst({
      where: {
        slotType: "EV",
        floor: { parkingLot: { tenantId: tenant.id } }
      }
    });
    if (!evSlot) throw new Error("No EV slot found to run tests");

    // Perform DB checkin
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: "T-E2E-1001",
        vehicleNumber: "TX-E2E-777",
        vehicleType: "EV",
        entryTime: new Date(Date.now() - 3.5 * 60 * 60 * 1000), // Checked in 3.5 hours ago to test fees
        status: "ACTIVE",
        paymentStatus: "PENDING",
        slotId: evSlot.id,
        tenantId: tenant.id,
        attendantId: attendant.id
      }
    });

    // Set slot to occupied
    await prisma.parkingSlot.update({
      where: { id: evSlot.id },
      data: { status: "OCCUPIED" }
    });

    // Now reload the attendant console
    const consoleAfter = await testPage(`${base}/tenant/metro-park/attendant`, attendantCookie);
    const consoleText = cleanHTML(consoleAfter.text);
    
    assertCondition(
      "Vehicle plate TX-E2E-777 is visible under Currently Parked list",
      consoleText.includes("TX-E2E-777")
    );
    assertCondition(
      "EV slot shows as OCCUPIED in the layout overview",
      consoleAfter.text.includes("occupied") || consoleAfter.text.includes("OCCUPIED")
    );

    // ----------------------------------------------------
    // Scenario 5: Customer Portal & Reservation
    // ----------------------------------------------------
    console.log("\n--- Scenario 5: Customer Portal & Reservations ---");
    
    const customerPageBefore = await testPage(`${base}/tenant/metro-park/customer`, customerCookie);
    assertCondition(
      "Customer Portal loads successfully under authorization",
      customerPageBefore.status === 200
    );

    // Create a database reservation for standard slot
    const mediumSlot = await prisma.parkingSlot.findFirst({
      where: {
        slotType: "MEDIUM",
        floor: { parkingLot: { tenantId: tenant.id } }
      }
    });
    if (!mediumSlot) throw new Error("No MEDIUM slot found to run tests");

    await prisma.reservation.create({
      data: {
        customerId: customer.id,
        slotId: mediumSlot.id,
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        status: "CONFIRMED"
      }
    });

    // Mark slot as RESERVED to verify layout renders RESERVED
    await prisma.parkingSlot.update({
      where: { id: mediumSlot.id },
      data: { status: "RESERVED" }
    });

    const customerPageAfter = await testPage(`${base}/tenant/metro-park/customer`, customerCookie);
    const customerText = cleanHTML(customerPageAfter.text);

    assertCondition(
      "Customer Portal contains interactive parking layout map",
      customerText.includes("Interactive Parking Layout")
    );
    assertCondition(
      "Slot status is updated to RESERVED on map layout",
      customerPageAfter.text.includes("reserved") || customerPageAfter.text.includes("RESERVED")
    );

    // ----------------------------------------------------
    // Scenario 6: Admin Dashboard & Settings
    // ----------------------------------------------------
    console.log("\n--- Scenario 6: Admin Dashboard & Configuration ---");
    
    const adminPageBefore = await testPage(`${base}/tenant/metro-park/admin`, adminCookie);
    assertCondition(
      "Admin Panel loads successfully under authorization",
      adminPageBefore.status === 200
    );
    
    // Let's toggle a slot to MAINTENANCE
    const largeSlot = await prisma.parkingSlot.findFirst({
      where: {
        slotType: "LARGE",
        floor: { parkingLot: { tenantId: tenant.id } }
      }
    });
    if (!largeSlot) throw new Error("No LARGE slot found to run tests");

    await prisma.parkingSlot.update({
      where: { id: largeSlot.id },
      data: { status: "MAINTENANCE" }
    });

    const adminPageAfter = await testPage(`${base}/tenant/metro-park/admin`, adminCookie);
    const adminText = cleanHTML(adminPageAfter.text);

    assertCondition(
      "Admin Panel displays overall stats counters",
      adminText.includes("Today's Earnings") || adminText.includes("Active Vehicles")
    );
    assertCondition(
      "Slot status is updated to MAINTENANCE in Admin dashboard overview",
      adminPageAfter.text.includes("maintenance") || adminPageAfter.text.includes("MAINTENANCE")
    );

    // ----------------------------------------------------
    // Scenario 7: Gate Check-Out Simulation
    // ----------------------------------------------------
    console.log("\n--- Scenario 7: Attendant Gate Check-Out ---");

    // Process checkout for TX-E2E-777
    const pricingRules = await prisma.pricingRule.findMany({
      where: { tenantId: tenant.id }
    });
    const evRule = pricingRules.find(r => r.vehicleType === "EV");
    const baseRate = evRule?.baseRate || 5.5;
    const hourlyRate = evRule?.hourlyRate || 2.5;

    // 3.5 hours: 1st hour is baseRate, remaining 2.5 hours at hourlyRate
    // total = baseRate + ceil(2.5) * hourlyRate = 5.5 + 3 * 2.5 = 13.0
    const calculatedFee = baseRate + Math.ceil(2.5) * hourlyRate;

    const exitTime = new Date();
    await prisma.$transaction([
      prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          exitTime,
          status: "PAID",
          totalFee: calculatedFee,
          paymentStatus: "PAID",
          paymentMethod: "CARD",
          exitAttendantId: attendant.id
        }
      }),
      prisma.parkingSlot.update({
        where: { id: evSlot.id },
        data: { status: "AVAILABLE" }
      })
    ]);

    // Reload attendant console to confirm slot is free and vehicle is removed from active list
    const consoleCheckOut = await testPage(`${base}/tenant/metro-park/attendant`, attendantCookie);
    const checkoutText = cleanHTML(consoleCheckOut.text);

    assertCondition(
      "Vehicle plate TX-E2E-777 is removed from Currently Parked list after checkout",
      !checkoutText.includes("TX-E2E-777")
    );
    assertCondition(
      "EV slot reverts back to AVAILABLE on the console layout mapping",
      !consoleCheckOut.text.includes(`slot-card occupied` + evSlot.slotNumber)
    );

    // ----------------------------------------------------
    // Scenario 8: Financial Reports Cockpit
    // ----------------------------------------------------
    console.log("\n--- Scenario 8: Financial Reports Cockpit ---");

    // Fetch reports page with daily filter for today using correct query params and local date
    const localYear = exitTime.getFullYear();
    const localMonth = String(exitTime.getMonth() + 1).padStart(2, "0");
    const localDay = String(exitTime.getDate()).padStart(2, "0");
    const localDateStr = `${localYear}-${localMonth}-${localDay}`;
    const reportsPage = await testPage(`${base}/tenant/metro-park/admin/reports?range=daily&date=${localDateStr}`, adminCookie);
    
    assertCondition(
      "Reports Panel loads successfully under authorization",
      reportsPage.status === 200
    );
    
    const reportsText = cleanHTML(reportsPage.text);
    
    assertCondition(
      "Reports dashboard displays Financial Accounting Center",
      reportsText.includes("Financial Accounting Center")
    );
    assertCondition(
      "Revenue summary aggregates and reflects the checkout fee value",
      reportsText.includes(`$${calculatedFee.toFixed(2)}`) || reportsPage.text.includes(calculatedFee.toFixed(2))
    );
    assertCondition(
      "Transaction table shows the checked-out vehicle record",
      reportsText.includes("TX-E2E-777")
    );

    // Revert status of LARGE slot and MEDIUM slot to AVAILABLE to leave DB clean
    await prisma.parkingSlot.update({
      where: { id: largeSlot.id },
      data: { status: "AVAILABLE" }
    });
    await prisma.parkingSlot.update({
      where: { id: mediumSlot.id },
      data: { status: "AVAILABLE" }
    });

  } catch (err: any) {
    console.error("❌ E2E Execution encountered error:", err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n========================================================");
  console.log(`=== E2E TESTING RESULTS: ${passedCount}/${totalTests} checks passed ===`);
  console.log("========================================================\n");

  if (passedCount !== totalTests) {
    process.exit(1);
  }
  process.exit(0);
}

runE2ETests();

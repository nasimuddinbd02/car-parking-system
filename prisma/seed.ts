import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";

const prisma = new PrismaClient();

// Salted scrypt hashing — must match hashPassword() in src/lib/utils.ts.
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derivedKey}`;
}

async function main() {
  console.log("Seeding database...");

  // 1. Delete all existing data to prevent duplicates
  await prisma.reservation.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.pricingRule.deleteMany({});
  await prisma.parkingSlot.deleteMany({});
  await prisma.parkingFloor.deleteMany({});
  await prisma.parkingLot.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});

  // 2. Create Tenants
  const tenant1 = await prisma.tenant.create({
    data: {
      name: "Metropolis Plaza Parking",
      slug: "metro-park",
    },
  });

  const tenant2 = await prisma.tenant.create({
    data: {
      name: "Apex Mall Parking",
      slug: "apex-park",
    },
  });

  console.log(`Created tenants: ${tenant1.name}, ${tenant2.name}`);

  // 3. Create Users
  // Tenant 1 Users
  await prisma.user.create({
    data: {
      name: "Metropolis Admin",
      email: "admin@metro.com",
      passwordHash: hashPassword("admin123"),
      role: "ADMIN",
      tenantId: tenant1.id,
    },
  });

  const t1Attendant = await prisma.user.create({
    data: {
      name: "John Attendant",
      email: "att1@metro.com",
      passwordHash: hashPassword("att123"),
      role: "ATTENDANT",
      tenantId: tenant1.id,
    },
  });

  await prisma.user.create({
    data: {
      name: "Sarah Driver",
      email: "driver@metro.com",
      passwordHash: hashPassword("driver123"),
      role: "CUSTOMER",
      tenantId: tenant1.id,
    },
  });

  // Tenant 2 Users
  await prisma.user.create({
    data: {
      name: "Apex Admin",
      email: "admin@apex.com",
      passwordHash: hashPassword("admin123"),
      role: "ADMIN",
      tenantId: tenant2.id,
    },
  });

  await prisma.user.create({
    data: {
      name: "David Attendant",
      email: "att1@apex.com",
      passwordHash: hashPassword("att123"),
      role: "ATTENDANT",
      tenantId: tenant2.id,
    },
  });

  console.log("Created users.");

  // 4. Create Pricing Rules
  const vehicleTypes = ["SMALL", "MEDIUM", "LARGE", "EV"];
  const pricingData = {
    SMALL: { baseRate: 2.0, hourlyRate: 1.0 },
    MEDIUM: { baseRate: 4.0, hourlyRate: 2.0 },
    LARGE: { baseRate: 7.0, hourlyRate: 3.5 },
    EV: { baseRate: 5.5, hourlyRate: 2.5 },
  };

  for (const type of vehicleTypes) {
    const rate = pricingData[type as keyof typeof pricingData];
    // Tenant 1 rules
    await prisma.pricingRule.create({
      data: {
        vehicleType: type,
        baseRate: rate.baseRate,
        hourlyRate: rate.hourlyRate,
        peakMultiplier: 1.0,
        tenantId: tenant1.id,
      },
    });

    // Tenant 2 rules
    await prisma.pricingRule.create({
      data: {
        vehicleType: type,
        baseRate: rate.baseRate + 0.5, // Apex is slightly more expensive
        hourlyRate: rate.hourlyRate + 0.5,
        peakMultiplier: 1.1,
        tenantId: tenant2.id,
      },
    });
  }

  console.log("Created pricing rules.");

  // 5. Create Parking Lots, Floors, and Slots
  // Tenant 1 ParkingLot
  const lot1 = await prisma.parkingLot.create({
    data: {
      name: "Metropolis Central Garage",
      location: "Downtown Boulevard 452",
      tenantId: tenant1.id,
    },
  });

  // 2 Floors for Metropolis Central Garage
  for (let f = 1; f <= 2; f++) {
    const floor = await prisma.parkingFloor.create({
      data: {
        floorNumber: f,
        parkingLotId: lot1.id,
      },
    });

    // Create 6 slots per floor: 1 Small, 3 Medium, 1 Large, 1 EV
    const slotConfigs = [
      { number: `F${f}-01`, type: "SMALL" },
      { number: `F${f}-02`, type: "MEDIUM" },
      { number: `F${f}-03`, type: "MEDIUM" },
      { number: `F${f}-04`, type: "MEDIUM" },
      { number: `F${f}-05`, type: "LARGE" },
      { number: `F${f}-06`, type: "EV" },
    ];

    for (const s of slotConfigs) {
      await prisma.parkingSlot.create({
        data: {
          slotNumber: s.number,
          slotType: s.type,
          status: "AVAILABLE",
          floorId: floor.id,
        },
      });
    }
  }

  // Tenant 2 ParkingLot
  const lot2 = await prisma.parkingLot.create({
    data: {
      name: "Apex East Deck",
      location: "Shopping District East Gate",
      tenantId: tenant2.id,
    },
  });

  // 1 Floor for Apex East Deck
  const floor2 = await prisma.parkingFloor.create({
    data: {
      floorNumber: 1,
      parkingLotId: lot2.id,
    },
  });

  // Create 5 slots for Apex Floor 1
  const t2Slots = [
    { number: "A-01", type: "SMALL" },
    { number: "A-02", type: "MEDIUM" },
    { number: "A-03", type: "MEDIUM" },
    { number: "A-04", type: "LARGE" },
    { number: "A-05", type: "EV" },
  ];

  for (const s of t2Slots) {
    await prisma.parkingSlot.create({
      data: {
        slotNumber: s.number,
        slotType: s.type,
        status: "AVAILABLE",
        floorId: floor2.id,
      },
    });
  }

  console.log("Created parking lots, floors, and slots.");

  // 6. Create some historical and active Tickets for analytics testing
  // We'll create some paid tickets and one active ticket for Metro Park
  const now = new Date();
  
  // Find a slot in lot1 floor1 to occupy
  const slotToOccupy = await prisma.parkingSlot.findFirst({
    where: {
      floor: { parkingLotId: lot1.id },
      slotNumber: "F1-02",
    },
  });

  if (slotToOccupy) {
    // Mark slot occupied
    await prisma.parkingSlot.update({
      where: { id: slotToOccupy.id },
      data: { status: "OCCUPIED" },
    });

    // Create active check-in ticket
    await prisma.ticket.create({
      data: {
        ticketNumber: "PK-2026-ACTIVE01",
        vehicleNumber: "NY-G592K",
        vehicleType: "MEDIUM",
        entryTime: new Date(now.getTime() - 2.5 * 60 * 60 * 1000), // Checked in 2.5 hrs ago
        status: "ACTIVE",
        paymentStatus: "PENDING",
        slotId: slotToOccupy.id,
        tenantId: tenant1.id,
        attendantId: t1Attendant.id,
      },
    });
  }

  // Create historical tickets (PAID) for reporting (Daily, Monthly, Yearly)
  const pastDates = [
    {
      ticketNumber: "PK-2026-PAID01",
      vehicleNumber: "TX-48A91",
      vehicleType: "SMALL",
      entryTime: new Date(now.getTime() - 48 * 60 * 60 * 1000), // 2 days ago
      exitTime: new Date(now.getTime() - 45 * 60 * 60 * 1000),  // Parked for 3 hours
      totalFee: 4.0, // base 2 + 2 hr * 1 = 4
      paymentMethod: "CASH",
    },
    {
      ticketNumber: "PK-2026-PAID02",
      vehicleNumber: "CA-99FF1",
      vehicleType: "MEDIUM",
      entryTime: new Date(now.getTime() - 10 * 60 * 60 * 1000),  // 10 hours ago
      exitTime: new Date(now.getTime() - 8 * 60 * 60 * 1000),    // Parked for 2 hours
      totalFee: 6.0, // base 4 + 1 hr * 2 = 6
      paymentMethod: "CARD",
    },
    {
      ticketNumber: "PK-2026-PAID03",
      vehicleNumber: "FL-M1929",
      vehicleType: "EV",
      entryTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),   // 2 hours ago
      exitTime: new Date(now.getTime() - 1 * 60 * 60 * 1000),   // Parked for 1 hour
      totalFee: 5.5, // base 5.5 + 0 hr * 2.5 = 5.5
      paymentMethod: "WALLET",
    },
    // Ticket in a previous month (for monthly/yearly reports testing)
    {
      ticketNumber: "PK-2026-PAID04",
      vehicleNumber: "NV-58B22",
      vehicleType: "LARGE",
      entryTime: new Date(now.getFullYear(), now.getMonth() - 1, 10, 10, 0), // Last month, 10th day
      exitTime: new Date(now.getFullYear(), now.getMonth() - 1, 10, 14, 0),  // 4 hours duration
      totalFee: 17.5, // base 7 + 3 hr * 3.5 = 17.5
      paymentMethod: "CARD",
    },
  ];

  for (const ticket of pastDates) {
    const slot = await prisma.parkingSlot.findFirst({
      where: { floor: { parkingLotId: lot1.id }, slotType: ticket.vehicleType },
    });

    if (slot) {
      await prisma.ticket.create({
        data: {
          ticketNumber: ticket.ticketNumber,
          vehicleNumber: ticket.vehicleNumber,
          vehicleType: ticket.vehicleType,
          entryTime: ticket.entryTime,
          exitTime: ticket.exitTime,
          status: "PAID",
          totalFee: ticket.totalFee,
          paymentStatus: "PAID",
          paymentMethod: ticket.paymentMethod,
          slotId: slot.id,
          tenantId: tenant1.id,
          attendantId: t1Attendant.id,
          exitAttendantId: t1Attendant.id,
        },
      });
    }
  }

  console.log("Seeded default tickets.");
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

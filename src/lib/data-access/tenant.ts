import prisma from "@/lib/db";

export async function findTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
  });
}

export async function findTenantWithStructureAndRules(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
    include: {
      parkingLots: {
        include: {
          floors: {
            include: {
              slots: true,
            },
          },
        },
      },
      pricingRules: true,
    },
  });
}

export async function findTenantWithOrderedStructure(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      parkingLots: {
        include: {
          floors: {
            include: {
              slots: {
                orderBy: { slotNumber: "asc" },
              },
            },
            orderBy: { floorNumber: "asc" },
          },
        },
      },
      pricingRules: {
        orderBy: { vehicleType: "asc" },
      },
    },
  });
}

export async function createTenantWithDefaults(
  companyName: string,
  cleanSlug: string,
  adminName: string,
  adminEmail: string,
  hashedPassword: string
) {
  return prisma.$transaction(async (tx) => {
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
        passwordHash: hashedPassword,
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
}

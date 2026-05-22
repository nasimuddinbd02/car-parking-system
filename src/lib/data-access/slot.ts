import prisma from "@/lib/db";

export async function findTenantFloorsAndSlots(tenantId: string) {
  return prisma.parkingFloor.findMany({
    where: {
      parkingLot: { tenantId },
    },
    include: {
      slots: {
        orderBy: { slotNumber: "asc" },
      },
    },
    orderBy: { floorNumber: "asc" },
  });
}

export async function findSlotWithFloor(slotId: string) {
  return prisma.parkingSlot.findUnique({
    where: { id: slotId },
    include: {
      floor: true,
    },
  });
}

export async function updateSlotStatus(slotId: string, status: "AVAILABLE" | "MAINTENANCE" | "OCCUPIED") {
  return prisma.parkingSlot.update({
    where: { id: slotId },
    data: { status },
  });
}

export async function findSlotByExactMatch(tenantId: string, vehicleType: string) {
  return prisma.parkingSlot.findFirst({
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
}

export async function findSlotByFallback(tenantId: string, fallbackTypes: string[]) {
  return prisma.parkingSlot.findFirst({
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

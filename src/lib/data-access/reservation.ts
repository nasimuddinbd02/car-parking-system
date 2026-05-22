import prisma from "@/lib/db";

export async function findCustomerReservations(customerId: string) {
  return prisma.reservation.findMany({
    where: {
      customerId,
    },
    include: {
      slot: {
        include: {
          floor: true,
        },
      },
    },
    orderBy: { startTime: "desc" },
  });
}

export async function findConflictingReservation(
  slotId: string,
  startTime: Date,
  endTime: Date
) {
  return prisma.reservation.findFirst({
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
}

export async function createReservation(
  customerId: string,
  slotId: string,
  startTime: Date,
  endTime: Date
) {
  return prisma.reservation.create({
    data: {
      customerId,
      slotId,
      startTime,
      endTime,
      status: "CONFIRMED",
    },
  });
}

import prisma from "@/lib/db";

export async function findActiveTicketsByTenant(tenantId: string) {
  return prisma.ticket.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
    },
    include: {
      slot: true,
    },
    orderBy: { entryTime: "desc" },
  });
}

export async function findCustomerTickets(tenantId: string, customerId: string) {
  return prisma.ticket.findMany({
    where: {
      customerId,
      tenantId,
    },
    include: {
      slot: true,
    },
    orderBy: { entryTime: "desc" },
  });
}

export async function findActiveTicketByPlateOrNumber(tenantId: string, cleanQuery: string) {
  return prisma.ticket.findFirst({
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
          floor: true,
        },
      },
    },
  });
}

export async function findTenantPaidTicketsInDateRange(tenantId: string, start: Date, end: Date) {
  return prisma.ticket.findMany({
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
}

export async function findTicketById(ticketId: string) {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
  });
}

export async function checkInTicketTransaction(
  tenantId: string,
  vehicleNumber: string,
  vehicleType: string,
  slotId: string,
  ticketNumber: string,
  attendantId?: string
) {
  return prisma.$transaction(async (tx) => {
    // Mark slot as OCCUPIED
    await tx.parkingSlot.update({
      where: { id: slotId },
      data: { status: "OCCUPIED" },
    });

    // Create Active Ticket
    return await tx.ticket.create({
      data: {
        ticketNumber,
        vehicleNumber,
        vehicleType,
        entryTime: new Date(),
        status: "ACTIVE",
        paymentStatus: "PENDING",
        slotId: slotId,
        tenantId,
        attendantId,
      },
      include: {
        slot: {
          include: {
            floor: {
              include: { parkingLot: true },
            },
          },
        },
      },
    });
  });
}

export async function checkOutTicketTransaction(
  ticketId: string,
  slotId: string,
  exitTime: Date,
  totalFee: number,
  paymentMethod: string,
  exitAttendantId?: string
) {
  return prisma.$transaction(async (tx) => {
    // Mark slot back to AVAILABLE
    await tx.parkingSlot.update({
      where: { id: slotId },
      data: { status: "AVAILABLE" },
    });

    // Update Ticket with checkout timestamp and fee details
    return await tx.ticket.update({
      where: { id: ticketId },
      data: {
        exitTime,
        status: "PAID",
        totalFee,
        paymentStatus: "PAID",
        paymentMethod,
        exitAttendantId,
      },
    });
  });
}

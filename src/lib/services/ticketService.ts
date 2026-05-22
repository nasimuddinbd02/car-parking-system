import {
  findActiveTicketsByTenant,
  findCustomerTickets,
  findActiveTicketByPlateOrNumber,
  findTenantPaidTicketsInDateRange,
  findTicketById,
  checkInTicketTransaction as dbCheckInTicketTransaction,
  checkOutTicketTransaction as dbCheckOutTicketTransaction,
} from "@/lib/data-access/ticket";

export async function getActiveTicketsByTenant(tenantId: string) {
  return findActiveTicketsByTenant(tenantId);
}

export async function getCustomerTickets(tenantId: string, customerId: string) {
  return findCustomerTickets(tenantId, customerId);
}

export async function getActiveTicketByPlateOrNumber(tenantId: string, query: string) {
  // Business logic: sanitization of input query
  const cleanQuery = query.toUpperCase().trim();
  return findActiveTicketByPlateOrNumber(tenantId, cleanQuery);
}

export async function getTenantPaidTicketsInDateRange(tenantId: string, start: Date, end: Date) {
  return findTenantPaidTicketsInDateRange(tenantId, start, end);
}

export async function getTicketById(ticketId: string) {
  return findTicketById(ticketId);
}

export async function checkInTicketTransaction(
  tenantId: string,
  vehicleNumber: string,
  vehicleType: string,
  slotId: string,
  ticketNumber: string,
  attendantId?: string
) {
  // Business logic: uppercase and trim input plate number
  const cleanVehicleNumber = vehicleNumber.toUpperCase().trim();
  return dbCheckInTicketTransaction(
    tenantId,
    cleanVehicleNumber,
    vehicleType,
    slotId,
    ticketNumber,
    attendantId
  );
}

export async function checkOutTicketTransaction(
  ticketId: string,
  slotId: string,
  exitTime: Date,
  totalFee: number,
  paymentMethod: string,
  exitAttendantId?: string
) {
  return dbCheckOutTicketTransaction(
    ticketId,
    slotId,
    exitTime,
    totalFee,
    paymentMethod,
    exitAttendantId
  );
}

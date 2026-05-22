import {
  findCustomerReservations,
  findConflictingReservation as dbFindConflictingReservation,
  createReservation as dbCreateReservation,
} from "@/lib/data-access/reservation";

export async function getCustomerReservations(customerId: string) {
  return findCustomerReservations(customerId);
}

export async function findConflictingReservation(
  slotId: string,
  startTime: Date,
  endTime: Date
) {
  return dbFindConflictingReservation(slotId, startTime, endTime);
}

export async function createReservation(
  customerId: string,
  slotId: string,
  startTime: Date,
  endTime: Date
) {
  return dbCreateReservation(customerId, slotId, startTime, endTime);
}

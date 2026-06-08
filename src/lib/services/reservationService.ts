import {
  findCustomerReservations,
  findConflictingReservation as dbFindConflictingReservation,
  createReservation as dbCreateReservation,
  findReservationById,
  setReservationStatus,
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

export async function getReservationById(reservationId: string) {
  return findReservationById(reservationId);
}

export async function cancelReservation(reservationId: string) {
  return setReservationStatus(reservationId, "CANCELLED");
}

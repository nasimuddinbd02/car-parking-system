import {
  findTenantFloorsAndSlots,
  findSlotWithFloor,
  updateSlotStatus as dbUpdateSlotStatus,
  findSlotByExactMatch,
  findSlotByFallback,
} from "@/lib/data-access/slot";

export async function getTenantFloorsAndSlots(tenantId: string) {
  return findTenantFloorsAndSlots(tenantId);
}

export async function getSlotWithFloor(slotId: string) {
  return findSlotWithFloor(slotId);
}

export async function updateSlotStatus(slotId: string, status: "AVAILABLE" | "MAINTENANCE" | "OCCUPIED") {
  return dbUpdateSlotStatus(slotId, status);
}

export async function findAvailableSlotForVehicle(tenantId: string, vehicleType: string) {
  // Business Rule: Try to find the exact match first
  let slot = await findSlotByExactMatch(tenantId, vehicleType);

  // Business Rule: If no exact match, fallback to any available slot that can fit this vehicle type
  if (!slot) {
    // SMALL fits in small, medium, large. MEDIUM in medium, large. LARGE in large. EV in EV.
    const fallbackTypes =
      vehicleType === "SMALL" ? ["SMALL", "MEDIUM", "LARGE"] :
      vehicleType === "MEDIUM" ? ["MEDIUM", "LARGE"] :
      [vehicleType]; // LARGE or EV only fits in respective slot type

    slot = await findSlotByFallback(tenantId, fallbackTypes);
  }

  return slot;
}

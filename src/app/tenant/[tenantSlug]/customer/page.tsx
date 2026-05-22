import { redirect } from "next/navigation";
import { getTenantFloorsAndSlots, getSlotWithFloor } from "@/lib/services/slotService";
import { getCustomerTickets } from "@/lib/services/ticketService";
import { getCustomerReservations } from "@/lib/services/reservationService";
import { getCurrentUser, createReservation } from "@/lib/actions";
import { formatCurrency, formatDisplayDate } from "@/lib/utils";
import { CalendarRange, Clock, CheckCircle2, AlertCircle, X } from "lucide-react";
import Link from "next/link";
import React from "react";

export default async function CustomerDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ slotId?: string; success?: string; error?: string }>;
}) {
  const { tenantSlug } = await params;
  const { slotId, success, error } = await searchParams;

  const user = await getCurrentUser();

  // 1. Authorization check
  if (!user || user.role !== "CUSTOMER" || user.tenantSlug !== tenantSlug) {
    redirect(`/tenant/${tenantSlug}/login`);
  }

  // 2. Fetch Floors & Slots for visual mapping
  const floors = await getTenantFloorsAndSlots(user.tenantId);

  // 3. Fetch User's Tickets & Reservations
  const tickets = await getCustomerTickets(user.tenantId, user.userId);

  const reservations = await getCustomerReservations(user.userId);

  // 4. Fetch details of selected slot if booking modal open
  let selectedSlot = null;
  if (slotId) {
    selectedSlot = await getSlotWithFloor(slotId);
  }

  // 5. Server Action wrapper for booking submit
  const handleReserveSubmit = async (formData: FormData) => {
    "use server";
    const slot = formData.get("slotId") as string;
    const startStr = formData.get("startTime") as string;
    const endStr = formData.get("endTime") as string;
    const customer = await getCurrentUser();

    if (!customer) return;

    const start = new Date(startStr);
    const end = new Date(endStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      redirect(`/tenant/${tenantSlug}/customer?slotId=${slot}&error=${encodeURIComponent("Invalid dates selected.")}`);
    }

    if (start >= end) {
      redirect(`/tenant/${tenantSlug}/customer?slotId=${slot}&error=${encodeURIComponent("End time must be after start time.")}`);
    }

    if (start < new Date()) {
      redirect(`/tenant/${tenantSlug}/customer?slotId=${slot}&error=${encodeURIComponent("Reservation cannot be in the past.")}`);
    }

    const res = await createReservation(customer.tenantId, customer.userId, slot, start, end);

    if (res.success) {
      redirect(`/tenant/${tenantSlug}/customer?success=true`);
    } else {
      redirect(`/tenant/${tenantSlug}/customer?slotId=${slot}&error=${encodeURIComponent(res.error || "Failed to create reservation")}`);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* Alert Banners */}
      {success && (
        <div style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid rgba(16, 185, 129, 0.2)", padding: "1.25rem", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <CheckCircle2 size={24} />
          <div>
            <strong style={{ fontSize: "1rem" }}>Reservation Confirmed!</strong>
            <p style={{ fontSize: "0.85rem", opacity: 0.9 }}>Your slot is successfully booked. Show your customer dashboard upon entry.</p>
          </div>
        </div>
      )}

      {error && !slotId && (
        <div style={{ background: "var(--danger-glow)", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "1.25rem", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <AlertCircle size={24} />
          <div>
            <strong style={{ fontSize: "1rem" }}>Error Processed</strong>
            <p style={{ fontSize: "0.85rem", opacity: 0.9 }}>{decodeURIComponent(error)}</p>
          </div>
        </div>
      )}

      {/* Booking Form Dialog Box (Rendered conditionally when slotId exists in URL) */}
      {selectedSlot && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          padding: "1rem"
        }}>
          <div className="glass-panel" style={{ maxWidth: "450px", width: "100%", position: "relative", padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <CalendarRange size={20} style={{ color: "var(--primary)" }} /> Book Parking Slot
              </h3>
              <Link href={`/tenant/${tenantSlug}/customer`} className="btn btn-secondary" style={{ padding: "0.4rem", borderRadius: "50%" }}>
                <X size={16} />
              </Link>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Reserving Slot <strong>{selectedSlot.slotNumber}</strong> (Floor {selectedSlot.floor.floorNumber}) for vehicle size <strong>{selectedSlot.slotType}</strong>.
            </p>

            <form action={handleReserveSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <input type="hidden" name="slotId" value={selectedSlot.id} />
              
              <div className="form-group">
                <label className="form-label">Reservation Start Time</label>
                <input
                  type="datetime-local"
                  name="startTime"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reservation End Time</label>
                <input
                  type="datetime-local"
                  name="endTime"
                  className="form-input"
                  required
                />
              </div>

              {error && (
                <div style={{ background: "var(--danger-glow)", color: "var(--danger)", padding: "0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                  {decodeURIComponent(error)}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                Confirm Reservation Booking
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Grid View Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "2rem" }}>
        
        {/* Left Column: Interactive Slot Booking Map */}
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800 }}>
              🗺️ Interactive Parking Layout
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Click any green &quot;Available&quot; slot to book it in advance.
            </p>
          </div>

          {floors.map((floor) => (
            <div key={floor.id} style={{ border: "1px solid var(--border-glass)", padding: "1rem", borderRadius: "var(--radius-sm)", background: "rgba(0,0,0,0.1)" }}>
              <h4 style={{ fontSize: "0.85rem", fontWeight: 800, marginBottom: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Floor {floor.floorNumber} Map
              </h4>

              <div className="slots-container">
                {floor.slots.map((slot) => {
                  const statusClass = 
                    slot.status === "OCCUPIED" ? "occupied" :
                    slot.status === "RESERVED" ? "reserved" :
                    slot.status === "MAINTENANCE" ? "maintenance" : "available";

                  return (
                    <Link
                      key={slot.id}
                      href={slot.status === "AVAILABLE" ? `/tenant/${tenantSlug}/customer?slotId=${slot.id}` : "#"}
                      className={`slot-card ${statusClass}`}
                      style={{
                        minHeight: "80px",
                        color: "inherit",
                        textDecoration: "none",
                        pointerEvents: slot.status === "AVAILABLE" ? "auto" : "none"
                      }}
                      title={slot.status === "AVAILABLE" ? "Click to Reserve Slot" : "Slot unavailable"}
                    >
                      <strong style={{ fontSize: "1rem" }}>{slot.slotNumber}</strong>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", marginTop: "0.25rem" }}>
                        {slot.slotType}
                      </span>
                      <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", marginTop: "0.25rem" }}>
                        {slot.status}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Bookings Lists & History */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Active Reservations */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <CalendarRange size={18} style={{ color: "var(--primary)" }} /> My Active Reservations ({reservations.length})
            </h3>

            {reservations.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "1rem 0" }}>
                You have no active reservations.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "250px", overflowY: "auto" }}>
                {reservations.map((res) => (
                  <div key={res.id} style={{ padding: "0.75rem 1rem", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-glass)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: "0.9rem" }}>Slot {res.slot.slotNumber}</strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
                        Floor {res.slot.floor.floorNumber} | Type: {res.slot.slotType}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "var(--primary)", display: "block", marginTop: "0.25rem" }}>
                        {formatDisplayDate(res.startTime)} - {formatDisplayDate(res.endTime)}
                      </span>
                    </div>
                    <span className="badge badge-available" style={{ fontSize: "0.65rem" }}>{res.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ticket Parking Sessions History */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <Clock size={18} style={{ color: "var(--accent)" }} /> Parking Session History ({tickets.length})
            </h3>

            {tickets.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "1rem 0" }}>
                You have no documented parking sessions at this location.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "300px", overflowY: "auto" }}>
                {tickets.map((ticket) => (
                  <div key={ticket.id} style={{ padding: "0.75rem 1rem", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-glass)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed var(--border-glass)", paddingBottom: "0.5rem", marginBottom: "0.5rem" }}>
                      <strong style={{ fontSize: "0.85rem", fontFamily: "monospace" }}>{ticket.ticketNumber}</strong>
                      <span className={`badge ${ticket.status === "ACTIVE" ? "badge-occupied" : "badge-available"}`} style={{ fontSize: "0.6rem" }}>
                        {ticket.status}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                      <span>Vehicle Size: {ticket.vehicleType} | Plate: {ticket.vehicleNumber}</span>
                      {ticket.totalFee && <strong style={{ color: "var(--accent)", fontSize: "0.9rem" }}>{formatCurrency(ticket.totalFee)}</strong>}
                    </div>

                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      <div>Entry: {formatDisplayDate(ticket.entryTime)}</div>
                      {ticket.exitTime && <div>Exit: {formatDisplayDate(ticket.exitTime)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

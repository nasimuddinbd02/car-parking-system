import { redirect } from "next/navigation";
import { getTenantFloorsAndSlots, getSlotWithFloor } from "@/lib/services/slotService";
import { getCustomerTickets } from "@/lib/services/ticketService";
import { getCustomerReservations } from "@/lib/services/reservationService";
import { getCurrentUser, createReservation, cancelReservation } from "@/lib/actions";
import { formatCurrency, formatDisplayDate } from "@/lib/utils";
import {
  CalendarRange,
  Clock,
  CheckCircle2,
  X,
  Car,
  Compass,
  Sparkles,
  CalendarDays,
  History,
  AlertTriangle,
  ArrowRight,
  Ban
} from "lucide-react";
import Link from "next/link";
import React from "react";

export default async function CustomerDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ slotId?: string; success?: string; cancelled?: string; error?: string }>;
}) {
  const { tenantSlug } = await params;
  const { slotId, success, cancelled, error } = await searchParams;

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

  // 5b. Server Action wrapper for cancelling a reservation
  const handleCancelSubmit = async (formData: FormData) => {
    "use server";
    const reservationId = formData.get("reservationId") as string;
    const res = await cancelReservation(reservationId);

    if (res.success) {
      redirect(`/tenant/${tenantSlug}/customer?cancelled=true`);
    } else {
      redirect(`/tenant/${tenantSlug}/customer?error=${encodeURIComponent(res.error || "Failed to cancel reservation")}`);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* ─── Page Title Header ─── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-glass)", paddingBottom: "1.25rem" }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", margin: 0, display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Car size={28} style={{ color: "var(--primary)" }} /> Driver Dashboard
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
            Book premium parking spots in advance, track active reservations, and manage your billing history.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="badge badge-available" style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}>
            <CalendarDays size={10} style={{ marginRight: 4 }} /> Driver Access
          </span>
        </div>
      </div>

      {/* Alert Banners */}
      {success && (
        <div style={{ 
          background: "var(--accent-glow)", 
          color: "var(--accent)", 
          border: "1px solid var(--accent)", 
          boxShadow: "0 0 16px var(--accent-glow)",
          padding: "1.25rem", 
          borderRadius: "var(--radius-md)", 
          display: "flex", 
          alignItems: "center", 
          gap: "0.75rem",
          animation: "fadeIn 0.4s ease-out"
        }}>
          <CheckCircle2 size={24} />
          <div>
            <strong style={{ fontSize: "1rem" }}>Reservation Confirmed!</strong>
            <p style={{ fontSize: "0.85rem", opacity: 0.9, margin: "0.15rem 0 0" }}>
              Your slot is successfully booked. Show your dashboard reservation ticket details at the gate entrance.
            </p>
          </div>
        </div>
      )}

      {cancelled && (
        <div style={{
          background: "var(--maintenance-glow)",
          color: "var(--text-muted)",
          border: "1px solid var(--maintenance)",
          boxShadow: "0 0 16px var(--maintenance-glow)",
          padding: "1.25rem",
          borderRadius: "var(--radius-md)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          animation: "fadeIn 0.4s ease-out"
        }}>
          <Ban size={24} />
          <div>
            <strong style={{ fontSize: "1rem", color: "var(--text-main)" }}>Reservation Cancelled</strong>
            <p style={{ fontSize: "0.85rem", opacity: 0.9, margin: "0.15rem 0 0" }}>
              The booking has been released and the slot is available again.
            </p>
          </div>
        </div>
      )}

      {error && !slotId && (
        <div style={{ 
          background: "var(--danger-glow)", 
          color: "var(--danger)", 
          border: "1px solid var(--danger)", 
          boxShadow: "0 0 16px var(--danger-glow)",
          padding: "1.25rem", 
          borderRadius: "var(--radius-md)", 
          display: "flex", 
          alignItems: "center", 
          gap: "0.75rem",
          animation: "fadeIn 0.4s ease-out"
        }}>
          <AlertTriangle size={24} />
          <div>
            <strong style={{ fontSize: "1rem" }}>Error Processed</strong>
            <p style={{ fontSize: "0.85rem", opacity: 0.9, margin: "0.15rem 0 0" }}>{decodeURIComponent(error)}</p>
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
          background: "rgba(9, 13, 22, 0.8)",
          backdropFilter: "blur(16px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          padding: "1rem",
          animation: "fadeIn 0.25s ease-out"
        }}>
          <div className="glass-panel" style={{ 
            maxWidth: "450px", 
            width: "100%", 
            position: "relative", 
            padding: "2rem",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.15)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, display: "flex", gap: "0.5rem", alignItems: "center", margin: 0 }}>
                <CalendarRange size={20} style={{ color: "var(--primary)" }} /> Book Parking Slot
              </h3>
              <Link 
                href={`/tenant/${tenantSlug}/customer`} 
                className="btn btn-secondary" 
                style={{ padding: "0.4rem", borderRadius: "50%", minWidth: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={16} />
              </Link>
            </div>

            <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-glass)", padding: "0.85rem", borderRadius: "10px", marginBottom: "1.5rem" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Target Space details</span>
              <div style={{ fontSize: "1rem", fontWeight: 800, marginTop: "0.25rem" }}>
                Slot {selectedSlot.slotNumber} &bull; Floor {selectedSlot.floor.floorNumber}
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 700, textTransform: "uppercase", display: "inline-block", marginTop: "0.15rem" }}>
                Class: {selectedSlot.slotType}
              </span>
            </div>

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
                <div style={{ 
                  background: "var(--danger-glow)", 
                  color: "var(--danger)", 
                  padding: "0.75rem", 
                  borderRadius: "var(--radius-sm)", 
                  fontSize: "0.8rem", 
                  border: "1px solid var(--danger)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}>
                  <AlertTriangle size={14} />
                  <span>{decodeURIComponent(error)}</span>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.85rem", fontSize: "0.95rem" }}>
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
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Compass size={20} style={{ color: "var(--primary)" }} /> Interactive Parking Layout
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem", margin: 0 }}>
              Select any green &quot;Available&quot; slot to reserve it in advance.
            </p>
          </div>

          {floors.map((floor) => (
            <div key={floor.id} style={{ border: "1px solid var(--border-glass)", padding: "1.25rem", borderRadius: "14px", background: "rgba(0,0,0,0.12)" }}>
              <h4 style={{ fontSize: "0.75rem", fontWeight: 800, marginBottom: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Floor {floor.floorNumber} Structure Overview
              </h4>

              <div className="slots-container" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: "0.75rem" }}>
                {floor.slots.map((slot) => {
                  const statusClass = 
                    slot.status === "OCCUPIED" ? "occupied" :
                    slot.status === "RESERVED" ? "reserved" :
                    slot.status === "MAINTENANCE" ? "maintenance" : "available";

                  const isAvailable = slot.status === "AVAILABLE";

                  return (
                    <Link
                      key={slot.id}
                      href={isAvailable ? `/tenant/${tenantSlug}/customer?slotId=${slot.id}` : "#"}
                      className={`slot-card ${statusClass}`}
                      style={{
                        minHeight: "75px",
                        color: "inherit",
                        textDecoration: "none",
                        borderRadius: "10px",
                        padding: "0.5rem",
                        pointerEvents: isAvailable ? "auto" : "none",
                        opacity: isAvailable ? 1 : 0.6
                      }}
                      title={isAvailable ? "Click to Reserve Slot" : "Slot unavailable"}
                    >
                      <strong style={{ fontSize: "1.05rem" }}>{slot.slotNumber}</strong>
                      <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginTop: "0.15rem" }}>
                        {slot.slotType}
                      </span>
                      <div style={{ marginTop: "0.3rem" }}>
                        {slot.status === "AVAILABLE" ? (
                          <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "var(--accent)", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: "2px" }}>
                            <Sparkles size={8} /> Book Now
                          </span>
                        ) : slot.status === "OCCUPIED" ? (
                          <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "var(--danger)", textTransform: "uppercase" }}>Parked</span>
                        ) : slot.status === "RESERVED" ? (
                          <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "var(--warning)", textTransform: "uppercase" }}>Reserved</span>
                        ) : (
                          <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Blocked</span>
                        )}
                      </div>
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
            <div style={{ borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.75rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, display: "flex", gap: "0.5rem", alignItems: "center", margin: 0 }}>
                <CalendarRange size={18} style={{ color: "var(--primary)" }} /> Active Reservations ({reservations.length})
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.15rem 0 0" }}>
                Current booked sessions registered for your account.
              </p>
            </div>

            {reservations.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-muted)" }}>
                <CalendarDays size={32} style={{ opacity: 0.3, marginBottom: "0.5rem" }} />
                <p style={{ fontSize: "0.85rem", margin: 0 }}>You have no active reservations.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "300px", overflowY: "auto", paddingRight: "0.25rem" }}>
                {reservations.map((res) => {
                  const isActive = res.status === "CONFIRMED" || res.status === "PENDING";
                  const statusBadgeClass =
                    res.status === "CANCELLED" ? "badge-occupied" :
                    res.status === "COMPLETED" ? "badge-maintenance" : "badge-available";

                  return (
                  <div
                    key={res.id}
                    style={{
                      padding: "1rem",
                      background: "rgba(255,255,255,0.01)",
                      border: "1px solid var(--border-glass)",
                      borderRadius: "10px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.75rem",
                      opacity: isActive ? 1 : 0.6
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "0.95rem" }}>Slot {res.slot.slotNumber}</strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginTop: "0.15rem" }}>
                        Floor {res.slot.floor.floorNumber} &bull; Type: {res.slot.slotType}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--primary)", fontWeight: 600 }}>
                        <Clock size={11} />
                        <span>{formatDisplayDate(res.startTime)}</span>
                        <ArrowRight size={11} />
                        <span>{formatDisplayDate(res.endTime)}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem", flexShrink: 0 }}>
                      <span className={`badge ${statusBadgeClass}`} style={{ fontSize: "0.65rem", padding: "0.25rem 0.6rem" }}>{res.status}</span>
                      {isActive && (
                        <form action={handleCancelSubmit}>
                          <input type="hidden" name="reservationId" value={res.id} />
                          <button
                            type="submit"
                            className="btn btn-secondary"
                            style={{ padding: "0.3rem 0.7rem", fontSize: "0.7rem", fontWeight: 700, borderRadius: "8px", gap: 4 }}
                            title="Cancel this reservation"
                          >
                            <Ban size={12} /> Cancel
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ticket Parking Sessions History */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.75rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, display: "flex", gap: "0.5rem", alignItems: "center", margin: 0 }}>
                <Clock size={18} style={{ color: "var(--warning)" }} /> Parking Session History ({tickets.length})
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0.15rem 0 0" }}>
                Historical log of completed or active check-ins at this location.
              </p>
            </div>

            {tickets.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-muted)" }}>
                <History size={32} style={{ opacity: 0.3, marginBottom: "0.5rem" }} />
                <p style={{ fontSize: "0.85rem", margin: 0 }}>No documented parking sessions found.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "300px", overflowY: "auto", paddingRight: "0.25rem" }}>
                {tickets.map((ticket) => (
                  <div key={ticket.id} style={{ padding: "1rem", background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-glass)", borderRadius: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed var(--border-glass)", paddingBottom: "0.6rem", marginBottom: "0.6rem" }}>
                      <strong style={{ fontSize: "0.85rem", fontFamily: "monospace", color: "var(--text-main)" }}>TICKET: {ticket.ticketNumber}</strong>
                      <span className={`badge ${ticket.status === "ACTIVE" ? "badge-occupied" : "badge-available"}`} style={{ fontSize: "0.6rem" }}>
                        {ticket.status}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ 
                          fontFamily: "monospace", 
                          fontSize: "0.8rem", 
                          fontWeight: 800, 
                          textTransform: "uppercase",
                          background: "var(--bg-input)",
                          padding: "1px 6px",
                          borderRadius: 4,
                          border: "1px solid var(--border-glass)",
                          color: "var(--text-main)"
                        }}>
                          {ticket.vehicleNumber}
                        </span>
                        <span>&bull; Size: {ticket.vehicleType}</span>
                      </div>
                      {ticket.totalFee && <strong style={{ color: "var(--warning)", fontSize: "0.95rem" }}>{formatCurrency(ticket.totalFee)}</strong>}
                    </div>

                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 3 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={10} />
                        <span>Entry: {formatDisplayDate(ticket.entryTime)}</span>
                      </div>
                      {ticket.exitTime && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={10} />
                          <span>Exit: {formatDisplayDate(ticket.exitTime)}</span>
                        </div>
                      )}
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

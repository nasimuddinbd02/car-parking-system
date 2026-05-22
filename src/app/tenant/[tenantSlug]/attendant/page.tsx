import { redirect } from "next/navigation";
import { getTenantFloorsAndSlots } from "@/lib/services/slotService";
import { getActiveTicketsByTenant } from "@/lib/services/ticketService";
import { getCurrentUser, checkInVehicle, searchActiveTicket, processCheckOut } from "@/lib/actions";
import { formatCurrency, formatDisplayDate, formatDurationText } from "@/lib/utils";
import { Search, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import React from "react";

export default async function AttendantPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ search?: string; successTicket?: string; checkedOut?: string; error?: string }>;
}) {
  const { tenantSlug } = await params;
  const { search, successTicket, checkedOut, error } = await searchParams;

  const user = await getCurrentUser();

  // 1. Authorization check
  if (!user || (user.role !== "ATTENDANT" && user.role !== "ADMIN") || user.tenantSlug !== tenantSlug) {
    redirect(`/tenant/${tenantSlug}/login`);
  }

  // 2. Query all slots and active tickets to populate dashboard lists
  const floors = await getTenantFloorsAndSlots(user.tenantId);

  const activeTickets = await getActiveTicketsByTenant(user.tenantId);

  // 3. Handle Plate/Ticket Search Query
  let foundTicketResult = null;
  if (search) {
    const searchRes = await searchActiveTicket(user.tenantId, search);
    if (searchRes.success && searchRes.ticket && searchRes.feeDetails) {
      foundTicketResult = {
        ticket: searchRes.ticket,
        feeDetails: searchRes.feeDetails,
      };
    } else {
      foundTicketResult = { error: searchRes.error || "No active ticket found." };
    }
  }

  // 4. Server Actions handlers
  const handleCheckInSubmit = async (formData: FormData) => {
    "use server";
    const plate = formData.get("plateNumber") as string;
    const size = formData.get("vehicleSize") as string;
    const attendant = await getCurrentUser();
    
    if (!attendant) return;

    const res = await checkInVehicle(attendant.tenantId, plate, size, attendant.userId);
    
    if (res.success && res.ticket) {
      redirect(`/tenant/${tenantSlug}/attendant?successTicket=${res.ticket.ticketNumber}`);
    } else {
      redirect(`/tenant/${tenantSlug}/attendant?error=${encodeURIComponent(res.error || "Check-in failed")}`);
    }
  };

  const handleCheckOutSubmit = async (formData: FormData) => {
    "use server";
    const ticketId = formData.get("ticketId") as string;
    const paymentMethod = formData.get("paymentMethod") as string;
    const attendant = await getCurrentUser();
    
    if (!attendant) return;

    const res = await processCheckOut(ticketId, paymentMethod, attendant.userId, attendant.tenantId);
    
    if (res.success) {
      redirect(`/tenant/${tenantSlug}/attendant?checkedOut=true`);
    } else {
      redirect(`/tenant/${tenantSlug}/attendant?search=${formData.get("searchVal")}&error=${encodeURIComponent(res.error || "Check-out failed")}`);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* Alert Notices */}
      {successTicket && (
        <div style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid rgba(16, 185, 129, 0.2)", padding: "1.25rem", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <CheckCircle2 size={24} />
          <div>
            <strong style={{ fontSize: "1rem" }}>Check-In Successful!</strong>
            <p style={{ fontSize: "0.85rem", opacity: 0.9 }}>Ticket generated: <strong>{successTicket}</strong>. Slot assigned and occupied.</p>
          </div>
        </div>
      )}

      {checkedOut && (
        <div style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid rgba(16, 185, 129, 0.2)", padding: "1.25rem", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <CheckCircle2 size={24} />
          <div>
            <strong style={{ fontSize: "1rem" }}>Checkout Finalized!</strong>
            <p style={{ fontSize: "0.85rem", opacity: 0.9 }}>Payment collected, invoice closed, and parking slot freed up.</p>
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: "var(--danger-glow)", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "1.25rem", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <AlertCircle size={24} />
          <div>
            <strong style={{ fontSize: "1rem" }}>Operation Failed</strong>
            <p style={{ fontSize: "0.85rem", opacity: 0.9 }}>{decodeURIComponent(error)}</p>
          </div>
        </div>
      )}

      {/* Main Splits Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "2rem" }}>
        
        {/* Left Console Pane: Gate Operations */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Section A: Gate Check-in Form */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 800 }}>
              📥 Gate Check-In (Vehicle Entry)
            </h3>
            
            <form action={handleCheckInSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">License Plate Number</label>
                <input
                  type="text"
                  name="plateNumber"
                  placeholder="e.g. TX-88A92"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Vehicle Size Category</label>
                <select name="vehicleSize" className="form-input" style={{ padding: "0.75rem" }} required>
                  <option value="MEDIUM">Standard Car (Medium)</option>
                  <option value="SMALL">Motorcycle (Small)</option>
                  <option value="LARGE">Truck / Van (Large)</option>
                  <option value="EV">Electric Vehicle (EV Charging Slot)</option>
                </select>
              </div>

              <button type="submit" className="btn btn-accent" style={{ width: "100%", marginTop: "0.5rem" }}>
                Auto-Allocate Slot & Check In
              </button>
            </form>
          </div>

          {/* Section B: Gate Check-out Form */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 800 }}>
              📤 Gate Check-Out (Vehicle Exit)
            </h3>
            
            <form method="GET" style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                name="search"
                defaultValue={search || ""}
                placeholder="Enter plate or ticket ID"
                className="form-input"
                style={{ flex: 1 }}
                required
              />
              <button type="submit" className="btn btn-secondary" style={{ padding: "0.75rem" }}>
                <Search size={16} /> Search
              </button>
            </form>

            {/* Display Found Checkout Ticket details */}
            {foundTicketResult && (
              <div style={{ borderTop: "1px solid var(--border-glass)", paddingTop: "1rem", marginTop: "0.25rem" }}>
                {foundTicketResult.error ? (
                  <div style={{ background: "var(--danger-glow)", color: "var(--danger)", padding: "0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                    {foundTicketResult.error}
                  </div>
                ) : foundTicketResult.ticket && foundTicketResult.feeDetails ? (
                  <form action={handleCheckOutSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <input type="hidden" name="ticketId" value={foundTicketResult.ticket.id} />
                    <input type="hidden" name="searchVal" value={search} />
                    
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-glass)", padding: "1rem", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border-glass)", paddingBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>TICKET #</span>
                        <strong style={{ fontSize: "0.85rem", fontFamily: "monospace" }}>{foundTicketResult.ticket.ticketNumber}</strong>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                        <span style={{ color: "var(--text-muted)" }}>Vehicle Plate</span>
                        <strong style={{ textTransform: "uppercase" }}>{foundTicketResult.ticket.vehicleNumber}</strong>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                        <span style={{ color: "var(--text-muted)" }}>Entry Time</span>
                        <span>{formatDisplayDate(foundTicketResult.ticket.entryTime)}</span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                        <span style={{ color: "var(--text-muted)" }}>Duration</span>
                        <strong>{formatDurationText(new Date(foundTicketResult.ticket.entryTime), new Date())}</strong>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", borderTop: "1px dashed var(--border-glass)", paddingTop: "0.5rem", marginTop: "0.25rem" }}>
                        <span style={{ color: "var(--text-main)", fontWeight: 700 }}>Total Fee Due</span>
                        <strong style={{ fontSize: "1.2rem", color: "var(--warning)" }}>
                          {formatCurrency(foundTicketResult.feeDetails.totalFee)}
                        </strong>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Payment Method Collected</label>
                      <select name="paymentMethod" className="form-input" style={{ padding: "0.75rem" }} required>
                        <option value="CASH">Collected Cash</option>
                        <option value="CARD">Processed Credit Card</option>
                        <option value="WALLET">Mobile Wallet Payment</option>
                      </select>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                      Finalize Checkout Gate Exit
                    </button>
                  </form>
                ) : null}
              </div>
            )}
          </div>

        </div>

        {/* Right Pane: Live Slot Maps & Active List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Section A: Live Map Grid */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 800 }}>
              🗺️ Live Slot Mapping Layout
            </h3>
            
            {floors.map((floor) => (
              <div key={floor.id} style={{ border: "1px solid var(--border-glass)", padding: "1rem", borderRadius: "var(--radius-sm)", background: "rgba(0,0,0,0.1)" }}>
                <h4 style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  Floor {floor.floorNumber} Overview
                </h4>

                <div className="slots-container" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))" }}>
                  {floor.slots.map((slot) => {
                    const statusClass = 
                      slot.status === "OCCUPIED" ? "occupied" :
                      slot.status === "RESERVED" ? "reserved" :
                      slot.status === "MAINTENANCE" ? "maintenance" : "available";

                    return (
                      <div
                        key={slot.id}
                        className={`slot-card ${statusClass}`}
                        style={{ minHeight: "60px", padding: "0.5rem" }}
                      >
                        <strong style={{ fontSize: "0.9rem" }}>{slot.slotNumber}</strong>
                        <span style={{ fontSize: "0.6rem", opacity: 0.7, textTransform: "uppercase" }}>{slot.slotType}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Section B: Active Parked Vehicles List */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 800 }}>
              🚗 Currently Parked Vehicles ({activeTickets.length})
            </h3>
            
            {activeTickets.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "1rem 0" }}>
                No vehicles are currently parked in this lot.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "300px", overflowY: "auto" }}>
                {activeTickets.map((ticket) => (
                  <div key={ticket.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-glass)", borderRadius: "var(--radius-sm)" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <strong style={{ fontSize: "0.9rem", textTransform: "uppercase" }}>{ticket.vehicleNumber}</strong>
                        <span className="badge badge-occupied" style={{ fontSize: "0.55rem", padding: "0.1rem 0.4rem" }}>
                          {ticket.slot.slotNumber} ({ticket.vehicleType})
                        </span>
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        Entered: {formatDisplayDate(ticket.entryTime)}
                      </span>
                    </div>
                    {/* Trigger exit checkout query link directly */}
                    <Link
                      href={`/tenant/${tenantSlug}/attendant?search=${ticket.ticketNumber}`}
                      className="btn btn-secondary"
                      style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem", fontWeight: 600 }}
                    >
                      Checkout Gate
                    </Link>
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

import { redirect } from "next/navigation";
import { getTenantFloorsAndSlots } from "@/lib/services/slotService";
import { getActiveTicketsByTenant } from "@/lib/services/ticketService";
import { getTenantWithOrderedStructure } from "@/lib/services/tenantService";
import { getCurrentUser, checkInVehicle, searchActiveTicket, processCheckOut } from "@/lib/actions";
import { formatCurrency, formatDisplayDate, formatDurationText } from "@/lib/utils";
import {
  Search,
  AlertCircle,
  CheckCircle2,
  Car,
  Clock,
  LayoutDashboard,
  Building,
  ArrowDownCircle,
  ArrowUpCircle,
  QrCode,
  CreditCard,
  Hash,
  Sparkles,
  Activity,
  AlertTriangle
} from "lucide-react";
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
  const tenant = await getTenantWithOrderedStructure(user.tenantId);

  // Calculate live slot stats
  let totalSlotsCount = 0;
  let occupiedSlotsCount = 0;
  let availableSlotsCount = 0;

  floors.forEach((floor) => {
    floor.slots.forEach((slot) => {
      totalSlotsCount++;
      if (slot.status === "OCCUPIED") occupiedSlotsCount++;
      else if (slot.status !== "MAINTENANCE") availableSlotsCount++;
    });
  });

  const occupancyRate = totalSlotsCount > 0 ? Math.round((occupiedSlotsCount / totalSlotsCount) * 100) : 0;

  // 3. Handle Plate/Ticket Search Query
  let foundTicketResult = null;
  if (search) {
    const searchRes = await searchActiveTicket(user.tenantId, search);
    if (searchRes.success && searchRes.ticket && searchRes.feeDetails) {
      const ticketRule = tenant?.pricingRules.find(r => r.vehicleType === searchRes.ticket.vehicleType);
      const ticketHourlyRate = ticketRule ? ticketRule.hourlyRate : 2.0;

      foundTicketResult = {
        ticket: searchRes.ticket,
        feeDetails: searchRes.feeDetails,
        hourlyRate: ticketHourlyRate,
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
      
      {/* ─── Page Title Header ─── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-glass)", paddingBottom: "1.25rem" }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", margin: 0, display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <LayoutDashboard size={28} style={{ color: "var(--primary)" }} /> Gate Attendant Board
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
            Manage real-time vehicle entry check-ins, validate exit payments, and monitor slot assignments.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="badge badge-available" style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}>
            <Activity size={10} style={{ marginRight: 4 }} /> Gate Active
          </span>
        </div>
      </div>

      {/* Alert Notices */}
      {successTicket && (
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
            <strong style={{ fontSize: "1rem" }}>Check-In Successful!</strong>
            <p style={{ fontSize: "0.85rem", opacity: 0.9, margin: "0.15rem 0 0" }}>
              Ticket generated: <strong style={{ fontFamily: "monospace", textDecoration: "underline" }}>{successTicket}</strong>. Slot assigned and status updated.
            </p>
          </div>
        </div>
      )}

      {checkedOut && (
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
            <strong style={{ fontSize: "1rem" }}>Checkout Finalized!</strong>
            <p style={{ fontSize: "0.85rem", opacity: 0.9, margin: "0.15rem 0 0" }}>
              Payment collected successfully. Invoice closed, and parking slot freed up.
            </p>
          </div>
        </div>
      )}

      {error && (
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
          <AlertCircle size={24} />
          <div>
            <strong style={{ fontSize: "1rem" }}>Operation Failed</strong>
            <p style={{ fontSize: "0.85rem", opacity: 0.9, margin: "0.15rem 0 0" }}>{decodeURIComponent(error)}</p>
          </div>
        </div>
      )}

      {/* ─── Upper Live Statistics Board ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
        
        {/* Total Lot spaces */}
        <div className="glass-panel" style={{ display: "flex", alignItems: "center", gap: "1.25rem", borderLeft: "4px solid var(--primary)", position: "relative", overflow: "hidden" }}>
          <div style={{ background: "var(--primary-glow)", color: "var(--primary)", padding: "0.8rem", borderRadius: "10px" }}>
            <Building size={22} />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Capacity</span>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 900, margin: "2px 0 0" }}>{totalSlotsCount} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)" }}>Slots</span></h3>
          </div>
        </div>

        {/* Occupied spots */}
        <div className="glass-panel" style={{ display: "flex", alignItems: "center", gap: "1.25rem", borderLeft: "4px solid var(--danger)", position: "relative", overflow: "hidden" }}>
          <div style={{ background: "var(--danger-glow)", color: "var(--danger)", padding: "0.8rem", borderRadius: "10px" }}>
            <Car size={22} />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Occupied Spaces</span>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 900, margin: "2px 0 0" }}>{occupiedSlotsCount} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)" }}>({occupancyRate}%)</span></h3>
          </div>
        </div>

        {/* Available spaces */}
        <div className="glass-panel" style={{ display: "flex", alignItems: "center", gap: "1.25rem", borderLeft: "4px solid var(--accent)", position: "relative", overflow: "hidden" }}>
          <div style={{ background: "var(--accent-glow)", color: "var(--accent)", padding: "0.8rem", borderRadius: "10px" }}>
            <Sparkles size={22} />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Available Slots</span>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 900, margin: "2px 0 0" }}>{availableSlotsCount} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)" }}>/ {totalSlotsCount}</span></h3>
          </div>
        </div>

      </div>

      {/* Main Splits Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "2rem" }}>
        
        {/* Left Console Pane: Gate Operations */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Section A: Gate Check-in Form */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.75rem" }}>
              <div style={{ background: "var(--primary-glow)", color: "var(--primary)", padding: "0.5rem", borderRadius: "8px" }}>
                <ArrowDownCircle size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>
                  Gate Check-In
                </h3>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Register vehicle and auto-allocate slot</span>
              </div>
            </div>
            
            <form action={handleCheckInSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div className="form-group">
                <label className="form-label">License Plate Number</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    name="plateNumber"
                    placeholder="e.g. TX-88A92"
                    className="form-input"
                    style={{ textTransform: "uppercase", paddingLeft: "2.5rem" }}
                    required
                  />
                  <Hash size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Vehicle Size Category</label>
                <div style={{ position: "relative" }}>
                  <select name="vehicleSize" className="form-input" style={{ padding: "0.75rem 1rem 0.75rem 2.5rem", appearance: "none" }} required>
                    <option value="MEDIUM">Standard Car (Medium)</option>
                    <option value="SMALL">Motorcycle (Small)</option>
                    <option value="LARGE">Truck / Van (Large)</option>
                    <option value="EV">Electric Vehicle (EV Charging Slot)</option>
                  </select>
                  <Car size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                </div>
              </div>

              <button type="submit" className="btn btn-accent" style={{ width: "100%", marginTop: "0.5rem", padding: "0.85rem" }}>
                Generate Ticket & Open Gate
              </button>
            </form>
          </div>

          {/* Section B: Gate Check-out Form */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.75rem" }}>
              <div style={{ background: "var(--danger-glow)", color: "var(--danger)", padding: "0.5rem", borderRadius: "8px" }}>
                <ArrowUpCircle size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>
                  Exit Checkout Terminal
                </h3>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Process egress payment and free slot</span>
              </div>
            </div>
            
            <form method="GET" style={{ display: "flex", gap: "0.5rem" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type="text"
                  name="search"
                  defaultValue={search || ""}
                  placeholder="Plate or ticket ID..."
                  className="form-input"
                  style={{ paddingLeft: "2.5rem" }}
                  required
                />
                <Search size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              </div>
              <button type="submit" className="btn btn-secondary" style={{ padding: "0.75rem 1.25rem" }}>
                Query
              </button>
            </form>

            {/* Display Found Checkout Ticket details */}
            {foundTicketResult && (
              <div style={{ borderTop: "1px solid var(--border-glass)", paddingTop: "1rem", marginTop: "0.25rem" }}>
                {foundTicketResult.error ? (
                  <div style={{ 
                    background: "var(--danger-glow)", 
                    color: "var(--danger)", 
                    padding: "1rem", 
                    borderRadius: "var(--radius-sm)", 
                    fontSize: "0.85rem", 
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }}>
                    <AlertTriangle size={16} />
                    {foundTicketResult.error}
                  </div>
                ) : foundTicketResult.ticket && foundTicketResult.feeDetails ? (
                  <form action={handleCheckOutSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <input type="hidden" name="ticketId" value={foundTicketResult.ticket.id} />
                    <input type="hidden" name="searchVal" value={search} />
                    
                    {/* ─── Virtual Ticket Stub ─── */}
                    <div style={{
                      background: "rgba(0,0,0,0.25)",
                      border: "1px solid var(--border-glass)",
                      borderRadius: 16,
                      padding: "20px",
                      position: "relative",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                      boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)"
                    }}>
                      {/* Ticket Cutouts */}
                      <div style={{ position: "absolute", left: -10, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, borderRadius: "50%", background: "var(--bg-main)", borderRight: "1px solid var(--border-glass)" }} />
                      <div style={{ position: "absolute", right: -10, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, borderRadius: "50%", background: "var(--bg-main)", borderLeft: "1px solid var(--border-glass)" }} />

                      {/* Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--warning)", boxShadow: "0 0 8px var(--warning)" }} />
                          <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--warning)" }}>
                            CALCULATING BALANCES
                          </span>
                        </div>
                        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "monospace" }}>EXIT PORTAL</span>
                      </div>

                      <div style={{ borderBottom: "1px dashed var(--border-glass)", margin: "2px 0" }} />

                      {/* Plate visual badge */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <div style={{
                          background: "var(--bg-input)",
                          border: "2px solid #1e293b",
                          borderRadius: 6,
                          padding: "8px 16px",
                          minWidth: "150px",
                          textAlign: "center",
                          position: "relative"
                        }}>
                          <div style={{ fontSize: "0.55rem", fontWeight: 800, color: "var(--primary)", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 1, marginBottom: 3 }}>
                            TERMINAL EXIT
                          </div>
                          <div style={{ fontSize: "1.4rem", fontWeight: 900, fontFamily: "monospace", textTransform: "uppercase", color: "var(--text-main)", letterSpacing: "0.03em" }}>
                            {foundTicketResult.ticket.vehicleNumber}
                          </div>
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                          TICKET #<strong style={{ fontFamily: "monospace", color: "var(--text-main)" }}>{foundTicketResult.ticket.ticketNumber}</strong>
                          <QrCode size={13} style={{ color: "var(--primary)", display: "inline-block" }} />
                        </span>
                      </div>

                      <div style={{ borderBottom: "1px dashed var(--border-glass)", margin: "2px 0" }} />

                      {/* Fields */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                          <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}><Car size={12} /> Class / Slot</span>
                          <span style={{ fontWeight: 700 }}>{foundTicketResult.ticket.vehicleType} &bull; {foundTicketResult.ticket.slot.slotNumber}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                          <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}><Clock size={12} /> Entry Time</span>
                          <span>{formatDisplayDate(foundTicketResult.ticket.entryTime)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                          <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}><Activity size={12} /> Active Duration</span>
                          <span style={{ fontWeight: 700, color: "var(--primary)" }}>
                            {formatDurationText(new Date(foundTicketResult.ticket.entryTime), new Date())}
                          </span>
                        </div>
                      </div>

                      <div style={{ borderBottom: "1px dashed var(--border-glass)", margin: "2px 0" }} />

                      {/* Totals */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)", padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.02)" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>Toll Amount Due</span>
                          <span style={{ fontSize: "0.6rem", color: "var(--warning)" }}>Rate: {formatCurrency(foundTicketResult.hourlyRate)}/hr</span>
                        </div>
                        <span style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--warning)" }}>
                          {formatCurrency(foundTicketResult.feeDetails.totalFee)}
                        </span>
                      </div>

                      {/* Monospace Barcode */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginTop: 4 }}>
                        <div style={{ fontFamily: "monospace", fontSize: "0.75rem", letterSpacing: "1px", color: "var(--text-muted)", opacity: 0.5, userSelect: "none" }}>
                          ||||| ||| | |||| || ||| | |||
                        </div>
                        <span style={{ fontSize: "0.55rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Gate Checkout Pass</span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Payment Method Collected</label>
                      <div style={{ position: "relative" }}>
                        <select name="paymentMethod" className="form-input" style={{ padding: "0.75rem 1rem 0.75rem 2.5rem", appearance: "none" }} required>
                          <option value="CASH">Collected Cash</option>
                          <option value="CARD">Processed Credit Card</option>
                          <option value="WALLET">Mobile Wallet Payment</option>
                        </select>
                        <CreditCard size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.85rem" }}>
                      Approve Payment & Unlock Gate
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
            <div style={{ borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.75rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                🗺️ Parking Layout Visualization
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.15rem 0 0" }}>
                Real-time active slot mapping visual representation.
              </p>
            </div>
            
            {floors.map((floor) => (
              <div key={floor.id} style={{ border: "1px solid var(--border-glass)", padding: "1rem", borderRadius: "12px", background: "rgba(0,0,0,0.12)" }}>
                <h4 style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 800, marginBottom: "0.75rem" }}>
                  Floor {floor.floorNumber} Structure Overview
                </h4>

                <div className="slots-container" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: "0.75rem" }}>
                  {floor.slots.map((slot) => {
                    const statusClass = 
                      slot.status === "OCCUPIED" ? "occupied" :
                      slot.status === "RESERVED" ? "reserved" :
                      slot.status === "MAINTENANCE" ? "maintenance" : "available";

                    return (
                      <div
                        key={slot.id}
                        className={`slot-card ${statusClass}`}
                        style={{ minHeight: "65px", padding: "0.4rem", borderRadius: "10px" }}
                      >
                        <strong style={{ fontSize: "0.95rem" }}>{slot.slotNumber}</strong>
                        <span style={{ fontSize: "0.6rem", opacity: 0.7, textTransform: "uppercase", fontWeight: 700, marginTop: "0.15rem" }}>{slot.slotType}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Section B: Active Parked Vehicles List */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.75rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                🚗 Parked Vehicles Ledger ({activeTickets.length})
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.15rem 0 0" }}>
                Current actively occupied spaces in the facilities.
              </p>
            </div>
            
            {activeTickets.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-muted)" }}>
                <Car size={32} style={{ opacity: 0.3, marginBottom: "0.5rem" }} />
                <p style={{ fontSize: "0.85rem", margin: 0 }}>No vehicles are currently parked in this lot.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "350px", overflowY: "auto", paddingRight: "0.25rem" }}>
                {activeTickets.map((ticket) => (
                  <div 
                    key={ticket.id} 
                    style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center", 
                      padding: "0.85rem", 
                      background: "rgba(255,255,255,0.01)", 
                      border: "1px solid var(--border-glass)", 
                      borderRadius: "10px",
                      transition: "var(--transition-smooth)"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ 
                          fontFamily: "monospace", 
                          fontSize: "0.9rem", 
                          fontWeight: 800, 
                          textTransform: "uppercase",
                          background: "var(--bg-input)",
                          padding: "2px 8px",
                          borderRadius: 4,
                          border: "1px solid var(--border-glass)",
                          color: "var(--text-main)"
                        }}>
                          {ticket.vehicleNumber}
                        </span>
                        <span className="badge badge-occupied" style={{ fontSize: "0.55rem", padding: "0.1rem 0.4rem" }}>
                          Slot {ticket.slot.slotNumber} &bull; {ticket.vehicleType}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: "0.35rem", color: "var(--text-muted)", fontSize: "0.7rem" }}>
                        <Clock size={10} />
                        <span>Entered: {formatDisplayDate(ticket.entryTime)}</span>
                      </div>
                    </div>
                    {/* Trigger exit checkout query link directly */}
                    <Link
                      href={`/tenant/${tenantSlug}/attendant?search=${ticket.ticketNumber}`}
                      className="btn btn-secondary"
                      style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem", fontWeight: 700, borderRadius: "8px" }}
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


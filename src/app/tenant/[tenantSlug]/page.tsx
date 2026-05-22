import prisma from "@/lib/db";
import Link from "next/link";
import { formatCurrency, formatDurationText, formatDisplayDate } from "@/lib/utils";
import { searchActiveTicket } from "@/lib/actions";
import { ParkingCircle, Car, BatteryCharging, ShieldCheck, Search, ClipboardList } from "lucide-react";

export default async function TenantPublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ plate?: string }>;
}) {
  const { tenantSlug } = await params;
  const { plate } = await searchParams;

  // 1. Fetch Tenant data
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: {
      parkingLots: {
        include: {
          floors: {
            include: {
              slots: true,
            },
          },
        },
      },
      pricingRules: true,
    },
  });

  if (!tenant) return <div>Tenant Not Found</div>;

  // 2. Count availability metrics
  let totalSlotsCount = 0;
  let availableSlotsCount = 0;
  const slotTypeStats: Record<string, { total: number; free: number }> = {
    SMALL: { total: 0, free: 0 },
    MEDIUM: { total: 0, free: 0 },
    LARGE: { total: 0, free: 0 },
    EV: { total: 0, free: 0 },
  };

  tenant.parkingLots.forEach((lot) => {
    lot.floors.forEach((floor) => {
      floor.slots.forEach((slot) => {
        totalSlotsCount++;
        if (slot.status === "AVAILABLE") {
          availableSlotsCount++;
        }
        if (slotTypeStats[slot.slotType]) {
          slotTypeStats[slot.slotType].total++;
          if (slot.status === "AVAILABLE") {
            slotTypeStats[slot.slotType].free++;
          }
        }
      });
    });
  });

  // 3. Search plate query logic if parameter provided
  let searchedTicketResult = null;
  if (plate) {
    const searchRes = await searchActiveTicket(tenant.id, plate);
    if (searchRes.success && searchRes.ticket && searchRes.feeDetails) {
      searchedTicketResult = {
        ticket: searchRes.ticket,
        feeDetails: searchRes.feeDetails,
      };
    } else {
      searchedTicketResult = { error: searchRes.error || "No active ticket found." };
    }
  }

  return (
    <div style={{ maxWidth: "1000px", width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Welcome Banner */}
      <div className="glass-panel" style={{ padding: "2.5rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1.5rem", borderLeft: "6px solid var(--primary)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
            Welcome to {tenant.name}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
            Real-time occupancy metrics, check pricing, and lookup active sessions.
          </p>
        </div>
        <Link href={`/tenant/${tenantSlug}/login`} className="btn btn-primary" style={{ padding: "0.8rem 1.5rem" }}>
          Driver Portal Sign In
        </Link>
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem" }}>
        
        {/* Left Column: Occupancy Stat Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-panel" style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "var(--primary-glow)",
              color: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              fontWeight: 800
            }}>
              {Math.round((availableSlotsCount / (totalSlotsCount || 1)) * 100)}%
            </div>
            <div>
              <h4 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Parking Lot Availability</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                {availableSlotsCount} of {totalSlotsCount} slots are currently free.
              </p>
            </div>
          </div>

          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.5rem" }}>
              Capacity By Size
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {Object.keys(slotTypeStats).map((type) => {
                const stat = slotTypeStats[type];
                const pct = Math.round((stat.free / (stat.total || 1)) * 100);
                
                return (
                  <div key={type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {type === "EV" ? <BatteryCharging size={16} style={{ color: "var(--accent)" }} /> : <Car size={16} />}
                      <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>{type} Sizes</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{stat.free} / {stat.total} free</span>
                      <span className={`badge ${stat.free > 0 ? "badge-available" : "badge-occupied"}`} style={{ fontSize: "0.65rem" }}>
                        {stat.free > 0 ? "Available" : "Full"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing Rules Box */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.5rem" }}>
              Pricing Rates
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {tenant.pricingRules.map((rule) => (
                <div key={rule.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                  <span style={{ fontWeight: 700 }}>{rule.vehicleType} Rule</span>
                  <span>
                    <strong>{formatCurrency(rule.baseRate)}</strong> entry fee + <strong>{formatCurrency(rule.hourlyRate)}/hr</strong>
                    {rule.peakMultiplier > 1 && <span style={{ color: "var(--warning)", marginLeft: "0.25rem" }}>(x{rule.peakMultiplier} peak)</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Ticket Tracker Plate Lookup */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800 }}>
              Live Plate Ticket Lookup
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Enter your plate number or ticket ID to review parking durations and current tallies.
            </p>

            <form method="GET" style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                name="plate"
                placeholder="e.g. NY-G592K"
                defaultValue={plate || ""}
                className="form-input"
                style={{ flex: 1 }}
                required
              />
              <button type="submit" className="btn btn-primary" style={{ padding: "0.75rem" }}>
                <Search size={16} /> Lookup
              </button>
            </form>

            {/* Display Search Results */}
            {searchedTicketResult && (
              <div style={{ borderTop: "1px solid var(--border-glass)", paddingTop: "1rem", marginTop: "0.5rem" }}>
                {searchedTicketResult.error ? (
                  <div style={{ background: "var(--danger-glow)", color: "var(--danger)", padding: "0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                    {searchedTicketResult.error}
                  </div>
                ) : searchedTicketResult.ticket && searchedTicketResult.feeDetails ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-glass)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border-glass)", paddingBottom: "0.5rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>TICKET #</span>
                      <strong style={{ fontSize: "0.85rem", fontFamily: "monospace" }}>{searchedTicketResult.ticket.ticketNumber}</strong>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>License Plate</span>
                      <strong style={{ textTransform: "uppercase" }}>{searchedTicketResult.ticket.vehicleNumber}</strong>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Vehicle Size</span>
                      <strong>{searchedTicketResult.ticket.vehicleType}</strong>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Entry Timestamp</span>
                      <span>{formatDisplayDate(searchedTicketResult.ticket.entryTime)}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Duration So Far</span>
                      <strong>{formatDurationText(newchedDate(searchedTicketResult.ticket.entryTime), new Date())}</strong>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", borderTop: "1px dashed var(--border-glass)", paddingTop: "0.5rem", marginTop: "0.25rem" }}>
                      <span style={{ color: "var(--text-main)", fontWeight: 700 }}>Accumulated Fee</span>
                      <strong style={{ fontSize: "1.1rem", color: "var(--warning)" }}>
                        {formatCurrency(searchedTicketResult.feeDetails.totalFee)}
                      </strong>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple wrapper to safely create Dates
function newchedDate(dateInput: any): Date {
  return new Date(dateInput);
}

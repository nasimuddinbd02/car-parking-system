import { getTenantWithStructureAndRules } from "@/lib/services/tenantService";
import Link from "next/link";
import { formatCurrency, formatDurationText, formatDisplayDate } from "@/lib/utils";
import { searchActiveTicket } from "@/lib/actions";
import {
  Car,
  BatteryCharging,
  Search,
  Building2,
  MapPin,
  Coins,
  Clock,
  Sparkles,
  Truck,
  CarFront,
  Activity
} from "lucide-react";

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
  const tenant = await getTenantWithStructureAndRules(tenantSlug);

  if (!tenant) return <div style={{ padding: "40px", textAlign: "center", color: "var(--danger)" }}>Tenant Not Found</div>;

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

  // Calculate dynamic availability percentage
  const availablePercent = totalSlotsCount > 0 ? Math.round((availableSlotsCount / totalSlotsCount) * 100) : 100;

  // Define dynamic colors based on occupancy state
  const isHighAvailability = availablePercent > 50;
  const isModerateOccupancy = availablePercent >= 10 && availablePercent <= 50;

  const statusBadgeText = isHighAvailability 
    ? "High Availability" 
    : isModerateOccupancy 
      ? "Moderate Occupancy" 
      : "Low Availability";

  const statusDescription = isHighAvailability 
    ? "Spaces are readily available. Drive in and park easily." 
    : isModerateOccupancy 
      ? "Garage is filling up. Parking spaces are limited." 
      : "Garage is nearly full. Expect delays.";

  const badgeColor = isHighAvailability 
    ? "var(--accent)" 
    : isModerateOccupancy 
      ? "var(--warning)" 
      : "var(--danger)";

  const badgeGlow = isHighAvailability 
    ? "var(--accent-glow)" 
    : isModerateOccupancy 
      ? "var(--warning-glow)" 
      : "var(--danger-glow)";

  const borderClass = isHighAvailability 
    ? "rgba(16, 185, 129, 0.3)" 
    : isModerateOccupancy 
      ? "rgba(245, 158, 11, 0.3)" 
      : "rgba(239, 68, 68, 0.3)";

  // 3. Search plate query logic if parameter provided
  let searchedTicketResult = null;
  if (plate) {
    const searchRes = await searchActiveTicket(tenant.id, plate);
    if (searchRes.success && searchRes.ticket && searchRes.feeDetails) {
      const ticketRule = tenant.pricingRules.find(r => r.vehicleType === searchRes.ticket.vehicleType);
      const ticketHourlyRate = ticketRule ? ticketRule.hourlyRate : 2.0;

      searchedTicketResult = {
        ticket: searchRes.ticket,
        feeDetails: searchRes.feeDetails,
        hourlyRate: ticketHourlyRate,
      };
    } else {
      searchedTicketResult = { error: searchRes.error || "No active ticket found." };
    }
  }

  return (
    <div style={{ maxWidth: "1200px", width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* ─── Welcome Header Card ─── */}
      <div className="glass-panel" style={{ 
        padding: "2.5rem", 
        display: "flex", 
        flexWrap: "wrap", 
        justifyContent: "space-between", 
        alignItems: "center", 
        gap: "1.5rem", 
        borderLeft: `6px solid ${badgeColor}`,
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Decorative background glow */}
        <div style={{
          position: "absolute",
          top: "-50%",
          left: "-10%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${badgeGlow} 0%, transparent 70%)`,
          pointerEvents: "none",
          zIndex: 0
        }} />

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", position: "relative", zIndex: 1, flex: 1, minWidth: "280px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              background: badgeGlow,
              border: `1px solid ${borderClass}`,
              color: badgeColor,
              padding: "4px 12px",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              display: "inline-flex",
              alignItems: "center",
              gap: 6
            }}>
              <Activity size={12} />
              {statusBadgeText}
            </span>
          </div>
          <h2 style={{ fontSize: "2.25rem", fontWeight: 900, letterSpacing: "-0.03em", margin: "0.25rem 0 0" }}>
            Welcome to {tenant.name}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem", margin: 0, maxWidth: "600px" }}>
            {statusDescription} Use this portal to check live parking availability, look up active pricing rules, and calculate active ticket fees.
          </p>
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <Link href={`/tenant/${tenantSlug}/login`} className="btn btn-primary animate-pulse" style={{ padding: "0.9rem 1.8rem", borderRadius: "10px", fontSize: "0.95rem" }}>
            Driver Portal Sign In
          </Link>
        </div>
      </div>

      {/* ─── Main Grid: Dashboard Analytics + Search ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "2rem" }}>
        
        {/* LEFT COLUMN: AVAILABILITY & STATS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* SVG Gauge & Capacity Breakdown */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={18} color="var(--primary)" /> Overall Space Availability
            </h3>
            
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-around", gap: "1.5rem", padding: "0.5rem 0" }}>
              {/* SVG Ring Gauge */}
              <div style={{ position: "relative", width: "120px", height: "120px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="transparent"
                    stroke="var(--border-glass)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="transparent"
                    stroke={badgeColor}
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 50}
                    strokeDashoffset={2 * Math.PI * 50 * (1 - availablePercent / 100)}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
                  />
                </svg>
                <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "1.75rem", fontWeight: 800 }}>{availablePercent}%</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Free</span>
                </div>
              </div>

              {/* Status Breakdown Numbers */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1, minWidth: "150px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Available Spaces</span>
                  <strong style={{ fontSize: "1rem", color: "var(--accent)" }}>{availableSlotsCount}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Occupied Spaces</span>
                  <strong style={{ fontSize: "1rem", color: "var(--danger)" }}>{totalSlotsCount - availableSlotsCount}</strong>
                </div>
                <div style={{ borderTop: "1px solid var(--border-glass)", paddingTop: "0.5rem" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 700 }}>Total Garage Capacity</span>
                  <strong style={{ fontSize: "1rem" }}>{totalSlotsCount}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Availability by Category Cards */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h3 style={{ 
              fontSize: "0.85rem", 
              fontWeight: 800, 
              textTransform: "uppercase", 
              letterSpacing: "0.06em", 
              color: "var(--text-muted)", 
              borderBottom: "1px solid var(--border-glass)", 
              paddingBottom: "0.5rem",
              margin: 0
            }}>
              Availability By Vehicle Class
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {Object.keys(slotTypeStats).map((type) => {
                const stat = slotTypeStats[type];
                const occupied = stat.total - stat.free;
                const fillPercent = stat.total > 0 ? Math.round((occupied / stat.total) * 100) : 0;
                
                // Class-specific configurations
                let ClassIcon = Car;
                let colorClass = "var(--primary)";
                if (type === "EV") {
                  ClassIcon = BatteryCharging;
                  colorClass = "var(--accent)";
                } else if (type === "LARGE") {
                  ClassIcon = Truck;
                  colorClass = "var(--warning)";
                } else if (type === "MEDIUM") {
                  ClassIcon = CarFront;
                  colorClass = "#8b5cf6"; // Purple
                }

                return (
                  <div key={type} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ 
                          width: 28, height: 28, borderRadius: 6, 
                          background: `rgba(${colorClass === "var(--accent)" ? "16, 185, 129" : colorClass === "var(--warning)" ? "245, 158, 11" : "59, 130, 246"}, 0.1)`, 
                          display: "flex", alignItems: "center", justifyContent: "center", color: colorClass 
                        }}>
                          <ClassIcon size={15} />
                        </div>
                        <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>{type} Spaces</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>
                          {stat.free} of {stat.total} free
                        </span>
                        <span className={`badge ${stat.free > 0 ? "badge-available" : "badge-occupied"}`} style={{ fontSize: "0.65rem" }}>
                          {stat.free > 0 ? "Available" : "Full"}
                        </span>
                      </div>
                    </div>
                    {/* Occupancy Progress Bar */}
                    <div style={{ width: "100%", height: 6, background: "rgba(255, 255, 255, 0.05)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ 
                        width: `${fillPercent}%`, 
                        height: "100%", 
                        background: `linear-gradient(90deg, var(--primary), ${colorClass})`, 
                        borderRadius: 3, 
                        transition: "width 0.6s ease" 
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Parking Lots & Locations */}
          {tenant.parkingLots.length > 0 && (
            <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ 
                fontSize: "0.85rem", 
                fontWeight: 800, 
                textTransform: "uppercase", 
                letterSpacing: "0.06em", 
                color: "var(--text-muted)", 
                borderBottom: "1px solid var(--border-glass)", 
                paddingBottom: "0.5rem",
                margin: 0
              }}>
                Active Garages & Lots
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {tenant.parkingLots.map((lot) => {
                  let lotTotal = 0;
                  let lotFree = 0;
                  lot.floors.forEach((fl) => {
                    fl.slots.forEach((sl) => {
                      lotTotal++;
                      if (sl.status === "AVAILABLE") lotFree++;
                    });
                  });

                  return (
                    <div key={lot.id} style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "space-between", 
                      padding: "12px 16px", 
                      borderRadius: 10, 
                      background: "rgba(255,255,255,0.01)", 
                      border: "1px solid var(--border-glass)" 
                    }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--primary-glow)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                          <Building2 size={16} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{lot.name}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                            <MapPin size={11} /> {lot.location || "Primary Facility"}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>{lotFree} / {lotTotal} free</span>
                        <span className={`badge ${lotFree > 0 ? "badge-available" : "badge-occupied"}`} style={{ fontSize: "0.6rem" }}>
                          {lotFree > 0 ? "Open" : "Full"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: PLATE LOOKUP & PRICING */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Plate Lookup Card */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
              <Search size={18} color="var(--primary)" /> Active Ticket Lookup
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
              Enter your license plate number to monitor current session duration and accumulated pricing in real-time.
            </p>

            <form method="GET" style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                name="plate"
                placeholder="e.g. NY-G592K"
                defaultValue={plate || ""}
                className="form-input"
                style={{ flex: 1, padding: "0.75rem 1rem", fontSize: "0.95rem" }}
                required
              />
              <button type="submit" className="btn btn-primary" style={{ padding: "0.75rem 1.25rem", borderRadius: "8px" }}>
                <Search size={16} /> Lookup
              </button>
            </form>

            {/* Display Search Results */}
            {searchedTicketResult && (
              <div style={{ borderTop: "1px solid var(--border-glass)", paddingTop: "1.25rem", marginTop: "0.5rem" }}>
                {searchedTicketResult.error ? (
                  <div style={{ 
                    background: "var(--danger-glow)", 
                    color: "var(--danger)", 
                    padding: "1rem", 
                    borderRadius: "10px", 
                    fontSize: "0.85rem", 
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }}>
                    <Activity size={16} />
                    {searchedTicketResult.error}
                  </div>
                ) : searchedTicketResult.ticket && searchedTicketResult.feeDetails ? (
                  
                  /* ─── Virtual Ticket Stub ─── */
                  <div style={{
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid var(--border-glass)",
                    borderRadius: 16,
                    padding: "24px",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)"
                  }}>
                    {/* Punch holes to look like ticket */}
                    <div style={{ position: "absolute", left: -10, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, borderRadius: "50%", background: "var(--bg-main)", borderRight: "1px solid var(--border-glass)" }} />
                    <div style={{ position: "absolute", right: -10, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, borderRadius: "50%", background: "var(--bg-main)", borderLeft: "1px solid var(--border-glass)" }} />

                    {/* Ticket Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 8px var(--accent)" }} className="animate-pulse" />
                        <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent)" }}>Active Parking Session</span>
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "monospace" }}>SECURE PASS</span>
                    </div>

                    <div style={{ borderBottom: "1px dashed var(--border-glass)", margin: "4px 0" }} />

                    {/* Embossed License Plate Style */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, margin: "8px 0" }}>
                      <div style={{
                        background: "var(--bg-input)",
                        border: "3px solid #1e293b",
                        borderRadius: 8,
                        padding: "10px 24px",
                        minWidth: "180px",
                        textAlign: "center",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        position: "relative",
                      }}>
                        <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "var(--primary)", letterSpacing: "0.15em", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 2, marginBottom: 4 }}>
                          PARKEASY SYSTEM
                        </div>
                        <div style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "0.05em", fontFamily: "monospace", textTransform: "uppercase", color: "var(--text-main)" }}>
                          {searchedTicketResult.ticket.vehicleNumber}
                        </div>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>TICKET NO: <strong style={{ fontFamily: "monospace", color: "var(--text-main)" }}>{searchedTicketResult.ticket.ticketNumber}</strong></span>
                    </div>

                    {/* Information fields */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                        <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}><Car size={13} /> Vehicle Classification</span>
                        <span style={{ fontWeight: 700 }}>{searchedTicketResult.ticket.vehicleType}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                        <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}><Clock size={13} /> Check-In Timestamp</span>
                        <span style={{ fontWeight: 600 }}>{formatDisplayDate(searchedTicketResult.ticket.entryTime)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                        <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}><Activity size={13} /> Elapsed Duration</span>
                        <span style={{ fontWeight: 700, color: "var(--primary)" }}>{formatDurationText(new Date(searchedTicketResult.ticket.entryTime), new Date())}</span>
                      </div>
                    </div>

                    <div style={{ borderBottom: "1px dashed var(--border-glass)", margin: "4px 0" }} />

                    {/* Live Tally */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)", padding: "12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.02)" }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Current Balance</span>
                        <span style={{ fontSize: "0.65rem", color: "var(--warning)" }}>Rate: {formatCurrency(searchedTicketResult.hourlyRate)}/hr</span>
                      </div>
                      <span style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--warning)" }}>
                        {formatCurrency(searchedTicketResult.feeDetails.totalFee)}
                      </span>
                    </div>

                    {/* Simulated barcode */}
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, height: 32, marginTop: 8, opacity: 0.6 }}>
                      {Array.from({ length: 24 }).map((_, idx) => {
                        const widths = [1, 2, 3, 4, 1, 3, 2, 1, 4, 2, 1, 3];
                        const w = widths[idx % widths.length];
                        return (
                          <div key={idx} style={{ width: w, height: "100%", background: "var(--text-muted)" }} />
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Pricing Rates Widget */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ 
              fontSize: "0.85rem", 
              fontWeight: 800, 
              textTransform: "uppercase", 
              letterSpacing: "0.06em", 
              color: "var(--text-muted)", 
              borderBottom: "1px solid var(--border-glass)", 
              paddingBottom: "0.5rem",
              margin: 0
            }}>
              Pricing Rates Sheet
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1rem" }}>
              {tenant.pricingRules.map((rule) => {
                const isEVRule = rule.vehicleType === "EV";
                
                return (
                  <div key={rule.id} className="glass-panel" style={{ 
                    padding: "16px", 
                    borderRadius: "12px", 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "10px", 
                    position: "relative",
                    background: "rgba(255,255,255,0.01)"
                  }}>
                    {rule.peakMultiplier > 1 && (
                      <div style={{ 
                        position: "absolute", 
                        top: 0, 
                        right: 0, 
                        background: "linear-gradient(135deg, var(--warning), var(--danger))", 
                        color: "#fff", 
                        fontSize: "0.55rem", 
                        fontWeight: 800, 
                        padding: "2px 6px", 
                        borderBottomLeftRadius: 6,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em"
                      }}>
                        Peak x{rule.peakMultiplier}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {isEVRule ? <BatteryCharging size={14} style={{ color: "var(--accent)" }} /> : <Car size={14} style={{ color: "var(--primary)" }} />}
                      <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)" }}>{rule.vehicleType} Class</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "1.1rem", fontWeight: 800 }}>{formatCurrency(rule.baseRate)}</span>
                      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Initial Entry Base</span>
                    </div>

                    <div style={{ borderTop: "1px dashed var(--border-glass)", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                      <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}><Coins size={10} /> Hourly:</span>
                      <strong style={{ color: "var(--text-main)" }}>{formatCurrency(rule.hourlyRate)}/hr</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTenantWithOrderedStructure } from "@/lib/services/tenantService";
import { getTenantPaidTicketsInDateRange } from "@/lib/services/ticketService";
import { getCurrentUser, toggleSlotMaintenance, updatePricingRule } from "@/lib/actions";
import { formatCurrency } from "@/lib/utils";
import {
  Activity,
  CircleDollarSign,
  Compass,
  Settings,
  AlertTriangle,
  Flame,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  BatteryCharging,
  Car,
  Truck,
  CarFront,
  Building2
} from "lucide-react";


export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const user = await getCurrentUser();

  // 1. Authorization check
  if (!user || user.role !== "ADMIN" || user.tenantSlug !== tenantSlug) {
    redirect(`/tenant/${tenantSlug}/login`);
  }

  // 2. Fetch Tenant structure (Lots, Floors, Slots, Pricing)
  const tenant = await getTenantWithOrderedStructure(user.tenantId);

  if (!tenant) return <div style={{ padding: "40px", textAlign: "center", color: "var(--danger)" }}>Tenant not found.</div>;

  // 3. Aggregate stats
  let totalSlotsCount = 0;
  let occupiedSlotsCount = 0;
  let availableSlotsCount = 0;
  let maintenanceSlotsCount = 0;

  tenant.parkingLots.forEach((lot) => {
    lot.floors.forEach((floor) => {
      floor.slots.forEach((slot) => {
        totalSlotsCount++;
        if (slot.status === "OCCUPIED") occupiedSlotsCount++;
        else if (slot.status === "MAINTENANCE") maintenanceSlotsCount++;
        else availableSlotsCount++;
      });
    });
  });

  const occupancyRate = totalSlotsCount > 0 ? Math.round((occupiedSlotsCount / totalSlotsCount) * 100) : 0;

  // Calculate today's revenue (from tickets checked out today)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const todayPaidTickets = await getTenantPaidTicketsInDateRange(user.tenantId, startOfToday, endOfToday);
  const todayRevenue = todayPaidTickets.reduce((sum, t) => sum + (t.totalFee || 0), 0);

  // Form actions for inline updates
  const handleToggleSlot = async (formData: FormData) => {
    "use server";
    const slotId = formData.get("slotId") as string;
    const status = formData.get("status") as string;
    await toggleSlotMaintenance(slotId, status);
    revalidatePath(`/tenant/${tenantSlug}/admin`);
  };

  const handleUpdatePrice = async (formData: FormData) => {
    "use server";
    const ruleId = formData.get("ruleId") as string;
    const baseRate = parseFloat(formData.get("baseRate") as string);
    const hourlyRate = parseFloat(formData.get("hourlyRate") as string);
    const peakMultiplier = parseFloat(formData.get("peakMultiplier") as string);
    await updatePricingRule(ruleId, baseRate, hourlyRate, peakMultiplier);
    revalidatePath(`/tenant/${tenantSlug}/admin`);
  };

  return (
    <div style={{ maxWidth: "1200px", width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* ─── Page Title Header ─── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-glass)", paddingBottom: "1.25rem" }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", margin: 0, display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <LayoutDashboard size={28} style={{ color: "var(--primary)" }} /> Admin Cockpit
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
            Manage pricing tariffs, monitor parking lot layouts, and toggle slots for administrative maintenance.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="badge badge-available" style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem", background: "var(--primary-glow)", color: "var(--primary)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
            <ShieldCheck size={12} style={{ marginRight: 4 }} /> Admin Authorized
          </span>
        </div>
      </div>

      {/* ─── Upper Dashboard Statistics Header ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
        
        {/* Earnings Card */}
        <div className="glass-panel" style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "1.25rem", 
          borderLeft: "4px solid var(--accent)",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute", top: "-20%", right: "-10%", width: "100px", height: "100px",
            background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)", pointerEvents: "none"
          }} />
          <div style={{ background: "var(--accent-glow)", color: "var(--accent)", padding: "0.85rem", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircleDollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Today&apos;s Earnings
            </span>
            <h3 style={{ fontSize: "1.65rem", fontWeight: 900, marginTop: "2px", color: "var(--text-main)" }}>{formatCurrency(todayRevenue)}</h3>
          </div>
        </div>

        {/* Occupancy Card */}
        <div className="glass-panel" style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "1.25rem", 
          borderLeft: "4px solid #8b5cf6",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute", top: "-20%", right: "-10%", width: "100px", height: "100px",
            background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)", pointerEvents: "none"
          }} />
          <div style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6", padding: "0.85rem", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={24} />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Occupancy Rate
            </span>
            <h3 style={{ fontSize: "1.65rem", fontWeight: 900, marginTop: "2px", color: "var(--text-main)" }}>
              {occupancyRate}%
            </h3>
          </div>
        </div>

        {/* Available Slots Card */}
        <div className="glass-panel" style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "1.25rem", 
          borderLeft: "4px solid var(--primary)",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute", top: "-20%", right: "-10%", width: "100px", height: "100px",
            background: "radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)", pointerEvents: "none"
          }} />
          <div style={{ background: "var(--primary-glow)", color: "var(--primary)", padding: "0.85rem", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Compass size={24} />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Capacity Available
            </span>
            <h3 style={{ fontSize: "1.65rem", fontWeight: 900, marginTop: "2px", color: "var(--text-main)" }}>
              {availableSlotsCount} <span style={{ fontSize: "1.1rem", fontWeight: 500, color: "var(--text-muted)" }}>/ {totalSlotsCount}</span>
            </h3>
          </div>
        </div>

        {/* Maintenance Card */}
        <div className="glass-panel" style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "1.25rem", 
          borderLeft: "4px solid var(--warning)",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute", top: "-20%", right: "-10%", width: "100px", height: "100px",
            background: "radial-gradient(circle, var(--warning-glow) 0%, transparent 70%)", pointerEvents: "none"
          }} />
          <div style={{ background: "var(--warning-glow)", color: "var(--warning)", padding: "0.85rem", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Under Maintenance
            </span>
            <h3 style={{ fontSize: "1.65rem", fontWeight: 900, marginTop: "2px", color: "var(--text-main)" }}>
              {maintenanceSlotsCount} <span style={{ fontSize: "1.1rem", fontWeight: 500, color: "var(--text-muted)" }}>Blocked</span>
            </h3>
          </div>
        </div>

      </div>

      {/* ─── Main Admin Panels Split Grid ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "2rem" }}>
        
        {/* LEFT COLUMN: VEHICLE PRICING TARIFFS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ borderBottom: "1px solid var(--border-glass)", paddingBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                <Settings size={18} style={{ color: "var(--primary)" }} /> Vehicle Pricing Rules
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem", margin: 0 }}>
                Configure base fees, hourly tariffs, and dynamic peak hour multipliers.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {tenant.pricingRules.map((rule) => {
                const isEV = rule.vehicleType === "EV";
                
                // Select vehicle icon
                let VehicleIcon = Car;
                let colorClass = "var(--primary)";
                if (isEV) {
                  VehicleIcon = Zap;
                  colorClass = "var(--accent)";
                } else if (rule.vehicleType === "LARGE") {
                  VehicleIcon = Truck;
                  colorClass = "var(--warning)";
                } else if (rule.vehicleType === "MEDIUM") {
                  VehicleIcon = CarFront;
                  colorClass = "#8b5cf6";
                }

                return (
                  <form
                    key={rule.id}
                    action={handleUpdatePrice}
                    style={{
                      background: "rgba(255, 255, 255, 0.01)",
                      border: "1px solid var(--border-glass)",
                      padding: "1.25rem",
                      borderRadius: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                      position: "relative",
                      overflow: "hidden"
                    }}
                  >
                    <input type="hidden" name="ruleId" value={rule.id} />
                    
                    {rule.peakMultiplier > 1 && (
                      <div style={{
                        position: "absolute", top: 0, right: 0,
                        background: "linear-gradient(135deg, var(--warning), var(--danger))",
                        color: "#fff", fontSize: "0.55rem", fontWeight: 800, padding: "3px 8px",
                        borderBottomLeftRadius: "6px", textTransform: "uppercase", letterSpacing: "0.03em",
                        display: "flex", alignItems: "center", gap: "2px"
                      }}>
                        <Flame size={10} /> Peak Active
                      </div>
                    )}
                    
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: `rgba(${colorClass === "var(--accent)" ? "16,185,129" : colorClass === "var(--warning)" ? "245,158,11" : colorClass === "#8b5cf6" ? "139,92,246" : "59,130,246"}, 0.1)`,
                        display: "flex", alignItems: "center", justifyContent: "center", color: colorClass
                      }}>
                        <VehicleIcon size={16} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                          {rule.vehicleType} Category
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          Standard Rate Profile
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: "0.65rem", fontWeight: 700 }}>Base Fee ($)</label>
                        <input
                          type="number"
                          name="baseRate"
                          step="0.01"
                          defaultValue={rule.baseRate}
                          className="form-input"
                          style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem", borderRadius: "8px" }}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: "0.65rem", fontWeight: 700 }}>Hourly ($)</label>
                        <input
                          type="number"
                          name="hourlyRate"
                          step="0.01"
                          defaultValue={rule.hourlyRate}
                          className="form-input"
                          style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem", borderRadius: "8px" }}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: "0.65rem", fontWeight: 700 }}>Peak Multiplier</label>
                        <input
                          type="number"
                          name="peakMultiplier"
                          step="0.1"
                          defaultValue={rule.peakMultiplier}
                          className="form-input"
                          style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem", borderRadius: "8px" }}
                          required
                        />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-secondary" style={{ padding: "0.55rem", fontSize: "0.8rem", width: "100%", borderRadius: "8px" }}>
                      Update Rates
                    </button>
                  </form>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE LAYOUT & MAINTENANCE toggler */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ borderBottom: "1px solid var(--border-glass)", paddingBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                ⚙️ Active Parking Lot Layout
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem", margin: 0 }}>
                Manage facilities. Click on slot buttons to toggle administrative maintenance states.
              </p>
            </div>

            {/* Render Slots per Floor */}
            {tenant.parkingLots.map((lot) => (
              <div key={lot.id} style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Building2 size={16} color="var(--primary)" />
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.03em" }}>
                    {lot.name}
                  </span>
                </div>

                {lot.floors.map((floor) => (
                  <div key={floor.id} style={{ border: "1px solid var(--border-glass)", borderRadius: "14px", padding: "1.25rem", background: "rgba(0,0,0,0.1)" }}>
                    <h4 style={{ fontSize: "0.8rem", fontWeight: 800, marginBottom: "1rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Floor {floor.floorNumber} Status Board
                    </h4>
                    
                    <div className="slots-container" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(105px, 1fr))" }}>
                      {floor.slots.map((slot) => {
                        const statusClass = 
                          slot.status === "OCCUPIED" ? "occupied" :
                          slot.status === "RESERVED" ? "reserved" :
                          slot.status === "MAINTENANCE" ? "maintenance" : "available";

                        const isClickable = slot.status === "AVAILABLE" || slot.status === "MAINTENANCE";

                        return (
                          <form key={slot.id} action={handleToggleSlot}>
                            <input type="hidden" name="slotId" value={slot.id} />
                            <input type="hidden" name="status" value={slot.status} />
                            
                            <button
                              type="submit"
                              disabled={!isClickable}
                              className={`slot-card ${statusClass}`}
                              style={{ 
                                width: "100%", 
                                background: "transparent", 
                                minHeight: "85px", 
                                color: "inherit", 
                                textDecoration: "none",
                                border: "1px solid var(--border-glass)",
                                cursor: isClickable ? "pointer" : "not-allowed",
                                opacity: isClickable ? 1 : 0.65
                              }}
                              title={
                                slot.status === "OCCUPIED" ? "Slot is occupied (Checkout first)" :
                                slot.status === "RESERVED" ? "Slot is reserved (Cannot maintain)" :
                                slot.status === "MAINTENANCE" ? "Click to set back to Available" : "Click to put in Maintenance"
                              }
                            >
                              <strong style={{ fontSize: "1.05rem" }}>{slot.slotNumber}</strong>
                              
                              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginTop: "0.15rem", display: "inline-flex", alignItems: "center", gap: "2px" }}>
                                {slot.slotType === "EV" && <BatteryCharging size={11} style={{ color: "var(--accent)" }} />}
                                {slot.slotType}
                              </span>

                              <div style={{ marginTop: "0.35rem", display: "flex", alignItems: "center", gap: 3 }}>
                                {slot.status === "MAINTENANCE" ? (
                                  <>
                                    <AlertTriangle size={11} style={{ color: "var(--danger)" }} />
                                    <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "var(--danger)", textTransform: "uppercase" }}>Blocked</span>
                                  </>
                                ) : slot.status === "OCCUPIED" ? (
                                  <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "var(--danger)", textTransform: "uppercase" }}>Occupied</span>
                                ) : slot.status === "RESERVED" ? (
                                  <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "var(--warning)", textTransform: "uppercase" }}>Reserved</span>
                                ) : (
                                  <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "var(--accent)", textTransform: "uppercase" }}>Ready</span>
                                )}
                              </div>
                            </button>
                          </form>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

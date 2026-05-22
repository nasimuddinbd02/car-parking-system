import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getCurrentUser, toggleSlotMaintenance, updatePricingRule } from "@/lib/actions";
import { formatCurrency } from "@/lib/utils";
import { Activity, CircleDollarSign, Compass, Settings, AlertTriangle, Eye } from "lucide-react";
import Link from "next/link";

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
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    include: {
      parkingLots: {
        include: {
          floors: {
            include: {
              slots: {
                orderBy: { slotNumber: "asc" },
              },
            },
            orderBy: { floorNumber: "asc" },
          },
        },
      },
      pricingRules: {
        orderBy: { vehicleType: "asc" },
      },
    },
  });

  if (!tenant) return <div>Tenant not found.</div>;

  // 3. Aggregate stats
  let totalSlotsCount = 0;
  let occupiedSlotsCount = 0;
  let maintenanceSlotsCount = 0;
  let availableSlotsCount = 0;

  const allSlots: any[] = [];
  tenant.parkingLots.forEach((lot) => {
    lot.floors.forEach((floor) => {
      floor.slots.forEach((slot) => {
        allSlots.push(slot);
        totalSlotsCount++;
        if (slot.status === "OCCUPIED") occupiedSlotsCount++;
        else if (slot.status === "MAINTENANCE") maintenanceSlotsCount++;
        else availableSlotsCount++;
      });
    });
  });

  // Calculate today's revenue (from tickets checked out today)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const todayPaidTickets = await prisma.ticket.findMany({
    where: {
      tenantId: user.tenantId,
      status: "PAID",
      exitTime: {
        gte: startOfToday,
        lte: endOfToday,
      },
    },
    select: { totalFee: true },
  });

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
      
      {/* Upper Dashboard Statistics Header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
        <div className="glass-panel" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "var(--accent-glow)", color: "var(--accent)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>
            <CircleDollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
              Today's Earnings
            </span>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{formatCurrency(todayRevenue)}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "var(--primary-glow)", color: "var(--primary)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>
            <Activity size={24} />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
              Occupancy Rate
            </span>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 800 }}>
              {Math.round((occupiedSlotsCount / (totalSlotsCount || 1)) * 100)}%
            </h3>
          </div>
        </div>

        <div className="glass-panel" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "var(--warning-glow)", color: "var(--warning)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>
            <Compass size={24} />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
              Available Slots
            </span>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 800 }}>
              {availableSlotsCount} / {totalSlotsCount}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Admin Panels Split Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "2rem" }}>
        
        {/* Left Column: Dynamic Pricing Rule Forms */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ borderBottom: "1px solid var(--border-glass)", paddingBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Settings size={18} style={{ color: "var(--primary)" }} /> Vehicle Pricing Rules
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Configure base fees, hourly tariffs, and peak hour multipliers.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {tenant.pricingRules.map((rule) => (
                <form
                  key={rule.id}
                  action={handleUpdatePrice}
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border-glass)",
                    padding: "1rem",
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <input type="hidden" name="ruleId" value={rule.id} />
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: "0.9rem", color: "var(--primary)" }}>
                      {rule.vehicleType} Vehicle Type
                    </strong>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
                      Pricing Configuration
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.7rem" }}>Base ($)</label>
                      <input
                        type="number"
                        name="baseRate"
                        step="0.01"
                        defaultValue={rule.baseRate}
                        className="form-input"
                        style={{ padding: "0.5rem" }}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.7rem" }}>Hourly ($)</label>
                      <input
                        type="number"
                        name="hourlyRate"
                        step="0.01"
                        defaultValue={rule.hourlyRate}
                        className="form-input"
                        style={{ padding: "0.5rem" }}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.7rem" }}>Peak Multi</label>
                      <input
                        type="number"
                        name="peakMultiplier"
                        step="0.1"
                        defaultValue={rule.peakMultiplier}
                        className="form-input"
                        style={{ padding: "0.5rem" }}
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-secondary" style={{ padding: "0.4rem", fontSize: "0.8rem", width: "100%" }}>
                    Save Rule
                  </button>
                </form>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Slot Controller Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ borderBottom: "1px solid var(--border-glass)", paddingBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  ⚙️ Active Parking Lot Layout
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  Select slot grid boxes to toggle maintenance blocks.
                </p>
              </div>
            </div>

            {/* Render Slots per Floor */}
            {tenant.parkingLots.map((lot) => (
              <div key={lot.id} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                    {lot.name}
                  </span>
                </div>

                {lot.floors.map((floor) => (
                  <div key={floor.id} style={{ border: "1px solid var(--border-glass)", borderRadius: "var(--radius-sm)", padding: "1rem", background: "rgba(0,0,0,0.1)" }}>
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
                          <form key={slot.id} action={handleToggleSlot}>
                            <input type="hidden" name="slotId" value={slot.id} />
                            <input type="hidden" name="status" value={slot.status} />
                            
                            <button
                              type="submit"
                              disabled={slot.status === "OCCUPIED" || slot.status === "RESERVED"}
                              className={`slot-card ${statusClass}`}
                              style={{ width: "100%", background: "transparent", minHeight: "80px", color: "inherit", textDecoration: "none" }}
                              title={
                                slot.status === "OCCUPIED" ? "Slot is occupied (Checkout first)" :
                                slot.status === "MAINTENANCE" ? "Click to set back to Available" : "Click to set to Maintenance"
                              }
                            >
                              <strong style={{ fontSize: "1rem" }}>{slot.slotNumber}</strong>
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", marginTop: "0.25rem" }}>
                                {slot.slotType}
                              </span>
                              {slot.status === "MAINTENANCE" && (
                                <AlertTriangle size={12} style={{ color: "var(--danger)", marginTop: "0.25rem" }} />
                              )}
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

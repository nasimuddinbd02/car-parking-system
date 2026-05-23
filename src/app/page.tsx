"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerTenant } from "@/lib/actions";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Building2, Plus, Sparkles, LogIn, ShieldAlert,
  Zap, BarChart3, ArrowRight,
  ShieldCheck, Layers, Shield
} from "lucide-react";

export default function SaaSPage() {
  const router = useRouter();

  // Registration form state
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active bottom tab
  const [activeTab, setActiveTab] = useState<"register" | "demos">("register");

  // Simulator State
  type SlotData = {
    id: number;
    number: string;
    type: string;
    status: string;
    baseRate: number;
    hourlyRate: number;
  };
  const [selectedSlot, setSelectedSlot] = useState<number>(3);
  const [slots, setSlots] = useState<SlotData[]>([
    { id: 1, number: "A-101", type: "STANDARD", status: "AVAILABLE", baseRate: 4.0, hourlyRate: 2.0 },
    { id: 2, number: "A-102", type: "STANDARD", status: "OCCUPIED", baseRate: 4.0, hourlyRate: 2.0 },
    { id: 3, number: "E-201", type: "EV", status: "AVAILABLE", baseRate: 6.0, hourlyRate: 3.5 },
    { id: 4, number: "E-202", type: "EV", status: "OCCUPIED", baseRate: 6.0, hourlyRate: 3.5 },
    { id: 5, number: "L-301", type: "LARGE", status: "RESERVED", baseRate: 8.0, hourlyRate: 4.0 },
    { id: 6, number: "M-302", type: "MEDIUM", status: "MAINTENANCE", baseRate: 5.0, hourlyRate: 2.5 },
  ]);

  const handleStatusChange = (slotId: number, nextStatus: string) => {
    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, status: nextStatus } : s)));
  };

  const occupiedCount = slots.filter((s) => s.status === "OCCUPIED").length;
  const reservedCount = slots.filter((s) => s.status === "RESERVED").length;
  const maintenanceCount = slots.filter((s) => s.status === "MAINTENANCE").length;
  const availableCount = slots.length - occupiedCount - reservedCount - maintenanceCount;
  const estEarnings = slots.reduce((acc, s) => {
    if (s.status === "OCCUPIED") return acc + s.baseRate + s.hourlyRate * 2;
    if (s.status === "RESERVED") return acc + s.baseRate * 0.8;
    return acc;
  }, 0);

  const handleCompanyChange = (val: string) => {
    setCompanyName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-"));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!companyName || !slug || !adminName || !adminEmail || !adminPassword) {
      setError("Please fill out all fields.");
      setLoading(false);
      return;
    }
    const res = await registerTenant(companyName, slug, adminName, adminEmail, adminPassword);
    if (res.success && res.tenantSlug) {
      router.push(`/tenant/${res.tenantSlug}/admin`);
    } else {
      setError(res.error || "Failed to register company.");
      setLoading(false);
    }
  };

  const activeSlot = slots.find((s) => s.id === selectedSlot);

  const statusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE": return { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.4)", text: "#10b981" };
      case "OCCUPIED": return { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.4)", text: "#ef4444" };
      case "RESERVED": return { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.4)", text: "#f59e0b" };
      case "MAINTENANCE": return { bg: "rgba(107,114,128,0.12)", border: "rgba(107,114,128,0.4)", text: "#6b7280" };
      default: return { bg: "transparent", border: "transparent", text: "inherit" };
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-main)", color: "var(--text-main)", fontFamily: "var(--font-sans)" }}>

      {/* ─── HEADER ─── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid var(--border-glass)",
        background: "var(--bg-main)",
        backdropFilter: "blur(16px)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: "linear-gradient(135deg, var(--primary), #6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px var(--primary-glow)",
            }}>
              <Building2 size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1 }}>
                PARK<span style={{ color: "var(--primary)" }}>EASY</span> SaaS
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 }}>
                Platform Hub
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section style={{
        textAlign: "center",
        padding: "80px 32px 48px",
        maxWidth: 800,
        margin: "0 auto",
        position: "relative",
      }}>
        {/* Ambient glow */}
        <div style={{
          position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)",
          width: 600, height: 400, borderRadius: "50%",
          background: "radial-gradient(ellipse, var(--primary-glow), transparent 70%)",
          pointerEvents: "none", zIndex: 0,
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "var(--primary-glow)", border: "1px solid rgba(59,130,246,0.25)",
            borderRadius: 999, padding: "6px 16px",
            fontSize: 12, fontWeight: 700, color: "var(--primary)",
            marginBottom: 24,
          }}>
            <Sparkles size={14} />
            Next-Generation Smart Parking Cloud
          </div>

          <h1 style={{
            fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            margin: "0 0 20px",
          }}>
            Control Your Parking{" "}
            <br />
            <span style={{
              background: "linear-gradient(135deg, var(--primary), #8b5cf6, var(--accent))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              System Effortlessly
            </span>
          </h1>

          <p style={{
            fontSize: 16, lineHeight: 1.7,
            color: "var(--text-muted)",
            maxWidth: 560, margin: "0 auto 36px",
          }}>
            Multi-tenant parking management with real-time slot tracking,
            EV pricing rules, attendant consoles, and consolidated financial reports.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => { setActiveTab("register"); document.getElementById("portal")?.scrollIntoView({ behavior: "smooth" }); }}
              className="btn btn-primary"
              style={{ padding: "12px 28px", fontSize: 14, borderRadius: 12 }}
            >
              <Plus size={16} />
              Initialize Workspace
            </button>
            <button
              onClick={() => { setActiveTab("demos"); document.getElementById("portal")?.scrollIntoView({ behavior: "smooth" }); }}
              className="btn btn-secondary"
              style={{ padding: "12px 28px", fontSize: 14, borderRadius: 12 }}
            >
              <LogIn size={16} />
              Explore Demos
            </button>
          </div>
        </div>
      </section>

      {/* ─── LIVE SIMULATOR ─── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 64px", width: "100%" }}>
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-glass)",
          borderRadius: 20,
          padding: 0,
          backdropFilter: "var(--glass-blur)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          overflow: "hidden",
        }}>
          {/* Sim Header */}
          <div style={{
            padding: "20px 28px",
            borderBottom: "1px solid var(--border-glass)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 12,
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block", animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em" }}>Live Simulator</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Interactive Floor State Map</h3>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { label: "Available", value: availableCount, color: "#10b981" },
                { label: "Occupied", value: occupiedCount, color: "#ef4444" },
                { label: "Reserved", value: reservedCount, color: "#f59e0b" },
                { label: "Out of Service", value: maintenanceCount, color: "#6b7280" },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: "center", minWidth: 64 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sim Body */}
          <div style={{ display: "flex", flexDirection: "row", minHeight: 340 }}>
            {/* Left: Slot Grid */}
            <div style={{ flex: 1, padding: 28, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, alignContent: "start" }}>
              {slots.map((slot) => {
                const sc = statusColor(slot.status);
                const isActive = selectedSlot === slot.id;
                return (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot.id)}
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      border: isActive ? "2px solid var(--primary)" : `1px solid ${sc.border}`,
                      background: isActive ? "var(--primary-glow)" : sc.bg,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex", flexDirection: "column", justifyContent: "space-between",
                      minHeight: 100,
                      transition: "all 0.2s ease",
                      outline: "none",
                      boxShadow: isActive ? "0 0 0 3px var(--primary-glow)" : "none",
                      color: "var(--text-main)",
                      fontFamily: "inherit",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 13 }}>{slot.number}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 800, textTransform: "uppercase",
                        background: sc.bg, color: sc.text,
                        border: `1px solid ${sc.border}`,
                        padding: "2px 8px", borderRadius: 6, letterSpacing: "0.05em",
                      }}>{slot.type}</span>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: sc.text }}>{slot.status}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginTop: 2 }}>
                        ${slot.baseRate.toFixed(2)} base + ${slot.hourlyRate.toFixed(2)}/hr
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: Inspector Panel */}
            <div style={{
              width: 320, minWidth: 280,
              borderLeft: "1px solid var(--border-glass)",
              padding: 28,
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              background: "rgba(0,0,0,0.02)",
            }}>
              {activeSlot ? (
                <>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Slot Inspector</h4>
                      <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", background: "var(--border-glass)", padding: "3px 10px", borderRadius: 6 }}>
                        ID #{activeSlot.id}
                      </span>
                    </div>

                    <div style={{
                      background: "var(--border-glass)", borderRadius: 12, padding: 16,
                      display: "flex", flexDirection: "column", gap: 10, marginBottom: 20,
                    }}>
                      {[
                        ["Slot Number", activeSlot.number],
                        ["Type", activeSlot.type],
                        ["Base Fee", `$${activeSlot.baseRate.toFixed(2)}`],
                        ["Hourly Rate", `$${activeSlot.hourlyRate.toFixed(2)}/hr`],
                      ].map(([label, val]) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>{label}</span>
                          <span style={{ fontWeight: 800, fontFamily: "monospace" }}>{val}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 10 }}>
                        Change Status
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        {(["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"] as const).map((st) => {
                          const isActive = activeSlot.status === st;
                          return (
                            <button
                              key={st}
                              onClick={() => handleStatusChange(activeSlot.id, st)}
                              style={{
                                padding: "8px 6px",
                                borderRadius: 8,
                                border: isActive ? "1.5px solid var(--primary)" : "1px solid var(--border-glass)",
                                background: isActive ? "var(--primary)" : "transparent",
                                color: isActive ? "#fff" : "var(--text-muted)",
                                fontSize: 10, fontWeight: 800, textTransform: "uppercase",
                                cursor: "pointer", transition: "all 0.15s",
                                fontFamily: "inherit", letterSpacing: "0.04em",
                              }}
                            >
                              {st}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid var(--border-glass)", paddingTop: 16, marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                      <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Rate (2 hours)</span>
                      <span style={{ fontWeight: 900, fontFamily: "monospace" }}>${(activeSlot.baseRate + activeSlot.hourlyRate * 2).toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                      <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>Est. Total Revenue</span>
                      <span style={{ fontWeight: 900, color: "#10b981", fontSize: 18 }}>${estEarnings.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
                  Click a slot to inspect
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 80px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
            Full Suite Infrastructure
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
            Production-ready architecture for streamlined operations and complete auditability.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {[
            { icon: <Layers size={22} />, title: "Multi-Floor Layouts", desc: "Design custom maps for multiple decks. Define slot allocations, type codes, and capacity indicators per zone.", color: "var(--primary)", glow: "var(--primary-glow)" },
            { icon: <Zap size={22} />, title: "EV Charging Rules", desc: "Set custom multipliers for high-voltage slots. Calculate peak duration rates and base fee differentials.", color: "var(--accent)", glow: "var(--accent-glow)" },
            { icon: <BarChart3 size={22} />, title: "Financial Auditing", desc: "Track daily transactions, shift logs, payment methods, and aggregated occupancy & revenue statistics.", color: "var(--primary)", glow: "var(--primary-glow)" },
            { icon: <ShieldCheck size={22} />, title: "Role-Based Security", desc: "AES-256-GCM cryptographic session seals. Differentiated customer, attendant, and admin access portals.", color: "var(--accent)", glow: "var(--accent-glow)" },
          ].map((f) => (
            <div
              key={f.title}
              className="glass-panel"
              style={{
                padding: 28,
                display: "flex", flexDirection: "column", gap: 16,
                transition: "transform 0.2s, box-shadow 0.3s",
                cursor: "default",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 12px 40px ${f.glow}`; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "var(--shadow-main)"; }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: f.glow, color: f.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `1px solid ${f.color}22`,
              }}>
                {f.icon}
              </div>
              <h4 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>{f.title}</h4>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PORTAL: Register + Demos ─── */}
      <section id="portal" style={{
        maxWidth: 640, margin: "0 auto", padding: "0 32px 80px", width: "100%",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
            Launch Your Workspace
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
            Initialize a fresh tenant or jump into pre-seeded environments.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: "flex", gap: 4,
          background: "var(--border-glass)",
          borderRadius: 12, padding: 4, marginBottom: 24,
        }}>
          {(["register", "demos"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: "10px 0",
                borderRadius: 9,
                border: "none",
                fontFamily: "inherit",
                fontSize: 13, fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
                background: activeTab === tab ? "var(--bg-card)" : "transparent",
                color: activeTab === tab ? "var(--text-main)" : "var(--text-muted)",
                boxShadow: activeTab === tab ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {tab === "register" ? "Initialize Tenant" : "Explore Demos"}
            </button>
          ))}
        </div>

        {/* Register Tab */}
        {activeTab === "register" && (
          <div className="glass-panel" style={{ padding: 32 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 4px" }}>Register New Parking Tenant</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 24px", lineHeight: 1.5 }}>
              Create your workspace and admin account in one step.
            </p>

            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label className="form-label" htmlFor="companyName">Company Name</label>
                  <input
                    id="companyName"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Gotham Mall Lots"
                    value={companyName}
                    onChange={(e) => handleCompanyChange(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="slug">URL Slug</label>
                  <input
                    id="slug"
                    type="text"
                    className="form-input"
                    placeholder="e.g. gotham-mall"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                  />
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                    Path: <code style={{ color: "var(--primary)", fontWeight: 700 }}>/tenant/{slug || "slug"}</code>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-glass)", paddingTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Shield size={14} color="var(--primary)" />
                  <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Admin Credentials</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label className="form-label" htmlFor="adminName">Full Name</label>
                    <input id="adminName" type="text" className="form-input" placeholder="John Doe"
                      value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label className="form-label" htmlFor="adminEmail">Email</label>
                      <input id="adminEmail" type="email" className="form-input" placeholder="admin@gotham.com"
                        value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="adminPassword">Password</label>
                      <input id="adminPassword" type="password" className="form-input" placeholder="••••••••"
                        value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: 12, borderRadius: 10,
                  background: "var(--danger-glow)", border: "1px solid rgba(239,68,68,0.25)",
                  color: "var(--danger)", fontSize: 13, fontWeight: 600,
                }}>
                  <ShieldAlert size={16} />
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn btn-primary"
                style={{ width: "100%", padding: "14px 0", borderRadius: 12, fontSize: 14, marginTop: 4 }}>
                {loading ? (
                  <><div style={{ width: 16, height: 16, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin-slow 1s linear infinite" }} /> Initializing...</>
                ) : (
                  <><Plus size={16} /> Initialize My Tenant</>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Demos Tab */}
        {activeTab === "demos" && (
          <div className="glass-panel" style={{ padding: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <LogIn size={18} color="var(--primary)" />
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Pre-Seeded Environments</h3>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 24px", lineHeight: 1.5 }}>
              Login shortcuts into databases with pricing profiles, multi-floor plans, and revenue logs.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { name: "Metropolis Central", slug: "metro-park", desc: "3-floor urban deck with EV charging rules and active commuter traffic." },
                { name: "Apex East Deck", slug: "apex-park", desc: "Premium commercial garage with high-voltage pricing tiers and daily auditing." },
              ].map((demo) => (
                <div key={demo.slug} style={{
                  padding: 20, borderRadius: 14,
                  border: "1px solid var(--border-glass)",
                  background: "rgba(0,0,0,0.02)",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                  transition: "border-color 0.2s",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-glass)"; }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em" }}>{demo.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", padding: "2px 8px", borderRadius: 6 }}>Active</span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 6px", lineHeight: 1.4 }}>{demo.desc}</p>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Slug: <code style={{ color: "var(--primary)", fontWeight: 700, background: "var(--primary-glow)", padding: "2px 6px", borderRadius: 4 }}>{demo.slug}</code>
                    </span>
                  </div>
                  <button
                    onClick={() => router.push(`/tenant/${demo.slug}/login`)}
                    className="btn btn-secondary"
                    style={{ borderRadius: 10, padding: "8px 18px", fontSize: 13, whiteSpace: "nowrap", flexShrink: 0 }}
                  >
                    Enter <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 20, padding: 14, borderRadius: 10,
              background: "var(--primary-glow)", border: "1px solid rgba(59,130,246,0.15)",
              fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5,
            }}>
              <strong style={{ color: "var(--primary)" }}>Credentials:</strong>{" "}
              Use <code style={{ fontWeight: 700, background: "var(--border-glass)", padding: "2px 6px", borderRadius: 4 }}>admin@metro.com</code>
              {" / "}
              <code style={{ fontWeight: 700, background: "var(--border-glass)", padding: "2px 6px", borderRadius: 4 }}>admin123</code>
              {" "}to access the Metropolis admin panel.
            </div>
          </div>
        )}
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{
        borderTop: "1px solid var(--border-glass)",
        padding: "24px 32px",
        marginTop: "auto",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: 12, color: "var(--text-muted)",
          flexWrap: "wrap", gap: 12,
        }}>
          <span>&copy; 2026 ParkEasy SaaS Inc. All rights reserved.</span>
          <span>Built with Next.js &amp; Prisma SQLite</span>
        </div>
      </footer>
    </div>
  );
}

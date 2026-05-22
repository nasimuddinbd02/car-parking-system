"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerTenant } from "@/lib/actions";
import ThemeToggle from "@/components/ThemeToggle";
import { Building2, Plus, Sparkles, LogIn, ShieldAlert } from "lucide-react";

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

  // Auto-generate slug as user types company name
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
      // Redirect to newly created admin panel
      router.push(`/tenant/${res.tenantSlug}/admin`);
    } else {
      setError(res.error || "Failed to register company.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Global Header */}
      <header
        className="glass-panel"
        style={{
          margin: "1.5rem",
          padding: "1rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderRadius: "var(--radius-md)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              background: "var(--primary-glow)",
              color: "var(--primary)",
              padding: "0.5rem",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Building2 size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              PARK<span style={{ color: "var(--primary)" }}>EASY</span> SaaS
            </h1>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
              Multi-Tenant Parking Management
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Hero Section & Form Container */}
      <main
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "2.5rem",
          maxWidth: "1200px",
          width: "calc(100% - 3rem)",
          margin: "0 auto 3rem auto",
          padding: "0 1.5rem",
          alignItems: "center",
        }}
      >
        {/* Left Column: Info & Demo Hub */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div
            className="glass-panel"
            style={{
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-20px",
                right: "-20px",
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "var(--primary-glow)",
                filter: "blur(20px)",
              }}
            />
            <div style={{ display: "inline-flex", padding: "0.4rem 0.8rem", borderRadius: "999px", background: "var(--primary-glow)", color: "var(--primary)", width: "max-content", fontSize: "0.75rem", fontWeight: 700, gap: "0.25rem", alignItems: "center" }}>
              <Sparkles size={12} /> Live SaaS Platform
            </div>
            <h2 style={{ fontSize: "2.25rem", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.03em" }}>
              Launch Your Own Parking Operations Instantly.
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.6 }}>
              ParkEasy SaaS is an all-in-one system design for managing smart parking slots, real-time ticket checkout gates, attendants, reservations, and multi-tenant billing analytics.
            </p>
            <div style={{ borderTop: "1px solid var(--border-glass)", paddingTop: "1rem", marginTop: "0.5rem" }}>
              <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                System Core Specifications
              </h4>
              <ul style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1.5rem", listStyle: "none", fontSize: "0.85rem" }}>
                <li>⚡ Next.js App Router</li>
                <li>📦 Prisma SQLite Client</li>
                <li>📊 Daily/Monthly Reports</li>
                <li>🔌 EV Charging Pricing</li>
              </ul>
            </div>
          </div>

          {/* Quick Demo Workspace Box */}
          <div className="glass-panel" style={{ padding: "1.5rem", borderLeft: "4px solid var(--primary)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <LogIn size={18} /> Test Drive Active Demos
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              We pre-seeded two demo tenant spaces with mock attendants, pricing values, and active parking slots:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.03)",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-glass)",
                }}
              >
                <div>
                  <h4 style={{ fontSize: "0.9rem", fontWeight: 700 }}>Metropolis Central</h4>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Workspace Slug: <code>metro-park</code></span>
                </div>
                <button
                  onClick={() => router.push("/tenant/metro-park/login")}
                  className="btn btn-secondary"
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                >
                  Enter
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.03)",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-glass)",
                }}
              >
                <div>
                  <h4 style={{ fontSize: "0.9rem", fontWeight: 700 }}>Apex East Deck</h4>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Workspace Slug: <code>apex-park</code></span>
                </div>
                <button
                  onClick={() => router.push("/tenant/apex-park/login")}
                  className="btn btn-secondary"
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                >
                  Enter
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Registration Form Card */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h3 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "0.25rem" }}>
            Register New Parking Tenant
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
            Configure your company slot database instantly in one form submission.
          </p>

          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input
                type="text"
                placeholder="e.g. Gotham Mall Lots"
                value={companyName}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tenant URL Slug</label>
              <input
                type="text"
                placeholder="e.g. gotham-mall"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div style={{ borderTop: "1px solid var(--border-glass)", margin: "0.5rem 0", paddingTop: "0.5rem" }}>
              <h4 style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                Admin Credentials (first account)
              </h4>
              
              <div className="form-group">
                <label className="form-label">Admin Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Admin Email</label>
                <input
                  type="email"
                  placeholder="admin@gotham.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Admin Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: "var(--danger-glow)",
                  color: "var(--danger)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  padding: "0.75rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ marginTop: "1rem", width: "100%" }}
            >
              {loading ? "Creating System Database..." : (
                <>
                  <Plus size={18} /> Initialize My Tenant
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "1.5rem", borderTop: "1px solid var(--border-glass)", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "auto" }}>
        © 2026 ParkEasy SaaS Inc. All rights reserved. Built using Next.js & Prisma.
      </footer>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { loginUser } from "@/lib/actions";
import { Shield, ArrowRight, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await loginUser(email, password, tenantSlug);

    if (res.success && res.user) {
      // Redirect based on role
      const role = res.user.role;
      if (role === "ADMIN") {
        router.push(`/tenant/${tenantSlug}/admin`);
      } else if (role === "ATTENDANT") {
        router.push(`/tenant/${tenantSlug}/attendant`);
      } else {
        router.push(`/tenant/${tenantSlug}/customer`);
      }
    } else {
      setError(res.error || "Login failed.");
      setLoading(false);
    }
  };

  // Helper to fill form fields and auto-submit for rapid demo testing
  const triggerSimulation = (simEmail: string, simPass: string) => {
    setEmail(simEmail);
    setPassword(simPass);
    setError(null);
  };

  // Get matching preseeded emails for user hint box based on slug
  const isMetro = tenantSlug === "metro-park";
  const isApex = tenantSlug === "apex-park";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        maxWidth: "480px",
        width: "100%",
        margin: "2rem auto",
        padding: "0 1rem"
      }}
    >
      <div className="glass-panel" style={{ width: "100%", padding: "2.5rem" }}>
        <h3
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            marginBottom: "0.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <Shield size={22} style={{ color: "var(--primary)" }} /> Workspace Login
        </h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "2rem" }}>
          Sign in to access your parking management dashboard.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="form-input"
              required
            />
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
                textAlign: "center"
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "0.5rem" }}
          >
            {loading ? "Authenticating Session..." : (
              <>
                Sign In <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Simulator Shortcut Assist Box */}
      {(isMetro || isApex) && (
        <div
          className="glass-panel"
          style={{
            width: "100%",
            marginTop: "1.5rem",
            padding: "1.5rem",
            borderLeft: "4px solid var(--warning)"
          }}
        >
          <h4
            style={{
              fontSize: "0.9rem",
              fontWeight: 700,
              marginBottom: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem"
            }}
          >
            <UserCheck size={16} style={{ color: "var(--warning)" }} /> Demo Account Simulation
          </h4>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            Click any role to load mock credentials, then click &quot;Sign In&quot;:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {isMetro && (
              <>
                <button
                  onClick={() => triggerSimulation("admin@metro.com", "admin123")}
                  className="btn btn-secondary"
                  style={{
                    padding: "0.5rem",
                    fontSize: "0.8rem",
                    justifyContent: "flex-start",
                    background: "rgba(255,255,255,0.02)"
                  }}
                >
                  👑 Metro Admin <code style={{ marginLeft: "auto", fontSize: "0.7rem" }}>admin@metro.com</code>
                </button>
                <button
                  onClick={() => triggerSimulation("att1@metro.com", "att123")}
                  className="btn btn-secondary"
                  style={{
                    padding: "0.5rem",
                    fontSize: "0.8rem",
                    justifyContent: "flex-start",
                    background: "rgba(255,255,255,0.02)"
                  }}
                >
                  💼 Metro Attendant <code style={{ marginLeft: "auto", fontSize: "0.7rem" }}>att1@metro.com</code>
                </button>
                <button
                  onClick={() => triggerSimulation("driver@metro.com", "driver123")}
                  className="btn btn-secondary"
                  style={{
                    padding: "0.5rem",
                    fontSize: "0.8rem",
                    justifyContent: "flex-start",
                    background: "rgba(255,255,255,0.02)"
                  }}
                >
                  🚗 Metro Customer <code style={{ marginLeft: "auto", fontSize: "0.7rem" }}>driver@metro.com</code>
                </button>
              </>
            )}

            {isApex && (
              <>
                <button
                  onClick={() => triggerSimulation("admin@apex.com", "admin123")}
                  className="btn btn-secondary"
                  style={{
                    padding: "0.5rem",
                    fontSize: "0.8rem",
                    justifyContent: "flex-start",
                    background: "rgba(255,255,255,0.02)"
                  }}
                >
                  👑 Apex Admin <code style={{ marginLeft: "auto", fontSize: "0.7rem" }}>admin@apex.com</code>
                </button>
                <button
                  onClick={() => triggerSimulation("att1@apex.com", "att123")}
                  className="btn btn-secondary"
                  style={{
                    padding: "0.5rem",
                    fontSize: "0.8rem",
                    justifyContent: "flex-start",
                    background: "rgba(255,255,255,0.02)"
                  }}
                >
                  💼 Apex Attendant <code style={{ marginLeft: "auto", fontSize: "0.7rem" }}>att1@apex.com</code>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

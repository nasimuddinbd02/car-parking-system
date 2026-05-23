"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { loginUser } from "@/lib/actions";
import { Shield, ArrowRight, UserCheck, Lock, Mail, Crown, Briefcase, Car } from "lucide-react";

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

  const triggerSimulation = (simEmail: string, simPass: string) => {
    setEmail(simEmail);
    setPassword(simPass);
    setError(null);
  };

  const isMetro = tenantSlug === "metro-park";
  const isApex = tenantSlug === "apex-park";

  return (
    <div style={{
      display: "flex",
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>

        {/* ─── Login Card ─── */}
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-glass)",
          borderRadius: 20,
          padding: "40px 36px",
          backdropFilter: "var(--glass-blur)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Top accent stripe */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 4,
            background: "linear-gradient(90deg, var(--primary), #8b5cf6, var(--accent))",
          }} />

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: "var(--primary-glow)",
              border: "1px solid rgba(59,130,246,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <Shield size={26} color="var(--primary)" />
            </div>
            <h3 style={{
              fontSize: 22, fontWeight: 900,
              letterSpacing: "-0.02em",
              margin: "0 0 6px",
            }}>
              Workspace Login
            </h3>
            <p style={{
              fontSize: 13, color: "var(--text-muted)",
              margin: 0, lineHeight: 1.5,
            }}>
              Sign in to access your parking management dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label className="form-label" htmlFor="login-email" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Mail size={13} color="var(--text-muted)" />
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="form-input"
                required
                style={{ fontSize: 14, padding: "12px 14px" }}
              />
            </div>

            <div>
              <label className="form-label" htmlFor="login-password" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Lock size={13} color="var(--text-muted)" />
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                required
                style={{ fontSize: 14, padding: "12px 14px" }}
              />
            </div>

            {error && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 14px", borderRadius: 12,
                background: "var(--danger-glow)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "var(--danger)",
                fontSize: 13, fontWeight: 600,
              }}>
                <Shield size={15} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 16, height: 16,
                    border: "2px solid rgba(255,255,255,0.4)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin-slow 0.8s linear infinite",
                  }} />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* ─── Demo Accounts Card ─── */}
        {(isMetro || isApex) && (
          <div style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-glass)",
            borderRadius: 16,
            padding: "24px 28px",
            backdropFilter: "var(--glass-blur)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            marginTop: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: "var(--warning-glow)",
                border: "1px solid rgba(245,158,11,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <UserCheck size={16} color="var(--warning)" />
              </div>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Demo Account Simulation</h4>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, marginTop: 2 }}>
                  Click a role to auto-fill credentials, then press Sign In
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {isMetro && (
                <>
                  <DemoButton
                    icon={<Crown size={14} />}
                    role="Metro Admin"
                    email="admin@metro.com"
                    color="var(--danger)"
                    colorGlow="var(--danger-glow)"
                    onClick={() => triggerSimulation("admin@metro.com", "admin123")}
                  />
                  <DemoButton
                    icon={<Briefcase size={14} />}
                    role="Metro Attendant"
                    email="att1@metro.com"
                    color="var(--accent)"
                    colorGlow="var(--accent-glow)"
                    onClick={() => triggerSimulation("att1@metro.com", "att123")}
                  />
                  <DemoButton
                    icon={<Car size={14} />}
                    role="Metro Customer"
                    email="driver@metro.com"
                    color="var(--warning)"
                    colorGlow="var(--warning-glow)"
                    onClick={() => triggerSimulation("driver@metro.com", "driver123")}
                  />
                </>
              )}

              {isApex && (
                <>
                  <DemoButton
                    icon={<Crown size={14} />}
                    role="Apex Admin"
                    email="admin@apex.com"
                    color="var(--danger)"
                    colorGlow="var(--danger-glow)"
                    onClick={() => triggerSimulation("admin@apex.com", "admin123")}
                  />
                  <DemoButton
                    icon={<Briefcase size={14} />}
                    role="Apex Attendant"
                    email="att1@apex.com"
                    color="var(--accent)"
                    colorGlow="var(--accent-glow)"
                    onClick={() => triggerSimulation("att1@apex.com", "att123")}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Reusable Demo Button ─── */
function DemoButton({
  icon, role, email, color, colorGlow, onClick,
}: {
  icon: React.ReactNode;
  role: string;
  email: string;
  color: string;
  colorGlow: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="btn btn-secondary"
      style={{
        width: "100%",
        padding: "10px 14px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        justifyContent: "flex-start",
        gap: 12,
        background: "rgba(255,255,255,0.02)",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = colorGlow; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-glass)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
    >
      <span style={{
        width: 28, height: 28, borderRadius: 8,
        background: colorGlow,
        color: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </span>
      <span style={{ fontWeight: 700 }}>{role}</span>
      <code style={{
        marginLeft: "auto",
        fontSize: 11,
        color: "var(--text-muted)",
        background: "var(--border-glass)",
        padding: "3px 8px",
        borderRadius: 6,
        fontWeight: 600,
      }}>
        {email}
      </code>
    </button>
  );
}

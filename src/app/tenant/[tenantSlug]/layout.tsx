import { notFound, redirect } from "next/navigation";
import { getTenantBySlug } from "@/lib/services/tenantService";
import ThemeToggle from "@/components/ThemeToggle";
import { getCurrentUser, logoutUser } from "@/lib/actions";
import Link from "next/link";
import { Building2, LogOut, Shield, User as UserIcon, Calendar, LayoutDashboard, BarChart3 } from "lucide-react";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  // 1. Verify tenant exists in the database
  const tenant = await getTenantBySlug(tenantSlug);

  if (!tenant) {
    notFound();
  }

  const user = await getCurrentUser();

  // Inline form action to handle server-side logout
  const performLogout = async () => {
    "use server";
    await logoutUser();
    redirect(`/tenant/${tenantSlug}/login`);
  };

  const roleColor =
    user?.role === "ADMIN"
      ? "var(--danger)"
      : user?.role === "ATTENDANT"
      ? "var(--accent)"
      : "var(--warning)";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-main)", color: "var(--text-main)", fontFamily: "var(--font-sans)" }}>

      {/* ─── Tenant Header ─── */}
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid var(--border-glass)",
        background: "var(--bg-main)",
        backdropFilter: "blur(16px)",
      }}>
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          {/* Left: Logo + Nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {/* Brand */}
            <Link
              href={`/tenant/${tenantSlug}`}
              style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: "linear-gradient(135deg, var(--primary), #6366f1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 12px var(--primary-glow)",
                flexShrink: 0,
              }}>
                <Building2 size={18} color="#fff" />
              </div>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.2 }}>
                  {tenant.name}
                </h2>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
                  /{tenantSlug}
                </span>
              </div>
            </Link>

            {/* Divider */}
            {user && user.tenantSlug === tenantSlug && (
              <div style={{ width: 1, height: 28, background: "var(--border-glass)", flexShrink: 0 }} />
            )}

            {/* Nav Links */}
            {user && user.tenantSlug === tenantSlug && (
              <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {user.role === "ADMIN" && (
                  <>
                    <NavLink href={`/tenant/${tenantSlug}/admin`} icon={<Shield size={14} />} iconColor="var(--primary)">
                      Admin Cockpit
                    </NavLink>
                    <NavLink href={`/tenant/${tenantSlug}/admin/reports`} icon={<BarChart3 size={14} />} iconColor="var(--accent)">
                      Financial Reports
                    </NavLink>
                  </>
                )}
                {user.role === "ATTENDANT" && (
                  <NavLink href={`/tenant/${tenantSlug}/attendant`} icon={<LayoutDashboard size={14} />} iconColor="var(--accent)">
                    Attendant Board
                  </NavLink>
                )}
                {user.role === "CUSTOMER" && (
                  <NavLink href={`/tenant/${tenantSlug}/customer`} icon={<Calendar size={14} />} iconColor="var(--warning)">
                    My Reservations
                  </NavLink>
                )}
              </nav>
            )}
          </div>

          {/* Right: User info + Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {user && user.tenantSlug === tenantSlug ? (
              <>
                {/* User badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: "var(--border-glass)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--text-muted)",
                    flexShrink: 0,
                  }}>
                    <UserIcon size={16} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{user.name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 800,
                      color: roleColor,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}>
                      {user.role}
                    </span>
                  </div>
                </div>

                {/* Logout */}
                <form action={performLogout}>
                  <button
                    type="submit"
                    title="Logout Session"
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--border-glass)",
                      background: "transparent",
                      color: "var(--text-muted)",
                      fontSize: 12, fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.2s",
                    }}
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </form>
              </>
            ) : (
              <Link
                href={`/tenant/${tenantSlug}/login`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 20px",
                  borderRadius: 10,
                  background: "var(--primary)",
                  color: "#fff",
                  fontSize: 13, fontWeight: 700,
                  textDecoration: "none",
                  boxShadow: "0 4px 14px var(--primary-glow)",
                  transition: "all 0.2s",
                }}
              >
                Sign In
              </Link>
            )}

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24 }}>
        {children}
      </main>

      {/* ─── Footer ─── */}
      <footer style={{
        borderTop: "1px solid var(--border-glass)",
        padding: "20px 24px",
        marginTop: "auto",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: 12, color: "var(--text-muted)",
          flexWrap: "wrap", gap: 8,
        }}>
          <span>© 2026 {tenant.name}. Powered by ParkEasy SaaS.</span>
        </div>
      </footer>
    </div>
  );
}

/* ─── Nav Link Component ─── */
function NavLink({
  href, icon, iconColor, children,
}: {
  href: string;
  icon: React.ReactNode;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 12px",
        borderRadius: 8,
        fontSize: 13, fontWeight: 600,
        textDecoration: "none",
        color: "var(--text-main)",
        transition: "background 0.2s",
      }}
    >
      <span style={{ color: iconColor, display: "flex", alignItems: "center" }}>{icon}</span>
      {children}
    </Link>
  );
}

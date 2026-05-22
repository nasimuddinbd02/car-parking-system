import { notFound, redirect } from "next/navigation";
import { getTenantBySlug } from "@/lib/services/tenantService";
import ThemeToggle from "@/components/ThemeToggle";
import { getCurrentUser, logoutUser } from "@/lib/actions";
import Link from "next/link";
import { Building2, LogOut, Shield, User as UserIcon, Calendar, LayoutDashboard } from "lucide-react";

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

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Tenant Specific Navbar */}
      <header
        className="glass-panel"
        style={{
          margin: "1.5rem 1.5rem 0 1.5rem",
          padding: "1rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderRadius: "var(--radius-md)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <Link
            href={`/tenant/${tenantSlug}`}
            style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                background: "var(--primary-glow)",
                color: "var(--primary)",
                padding: "0.5rem",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center"
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                {tenant.name}
              </h2>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
                /{tenantSlug}
              </span>
            </div>
          </Link>

          {/* Navigation Links based on authentication */}
          {user && user.tenantSlug === tenantSlug && (
            <nav style={{ display: "flex", alignItems: "center", gap: "1rem", marginLeft: "1rem" }}>
              {user.role === "ADMIN" && (
                <>
                  <Link
                    href={`/tenant/${tenantSlug}/admin`}
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      textDecoration: "none",
                      color: "var(--text-main)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem"
                    }}
                  >
                    <Shield size={16} style={{ color: "var(--primary)" }} /> Admin Cockpit
                  </Link>
                  <Link
                    href={`/tenant/${tenantSlug}/admin/reports`}
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      textDecoration: "none",
                      color: "var(--text-main)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem"
                    }}
                  >
                    📈 Financial Reports
                  </Link>
                </>
              )}
              {user.role === "ATTENDANT" && (
                <Link
                  href={`/tenant/${tenantSlug}/attendant`}
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    color: "var(--text-main)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem"
                  }}
                >
                  <LayoutDashboard size={16} style={{ color: "var(--accent)" }} /> Attendant Board
                </Link>
              )}
              {user.role === "CUSTOMER" && (
                <Link
                  href={`/tenant/${tenantSlug}/customer`}
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    color: "var(--text-main)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem"
                  }}
                >
                  <Calendar size={16} style={{ color: "var(--warning)" }} /> My Reservations
                </Link>
              )}
            </nav>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* User Section */}
          {user && user.tenantSlug === tenantSlug ? (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid var(--border-glass)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)"
                  }}
                >
                  <UserIcon size={16} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>{user.name}</span>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color:
                        user.role === "ADMIN"
                          ? "var(--danger)"
                          : user.role === "ATTENDANT"
                          ? "var(--accent)"
                          : "var(--warning)",
                      textTransform: "uppercase"
                    }}
                  >
                    {user.role}
                  </span>
                </div>
              </div>

              <form action={performLogout}>
                <button
                  type="submit"
                  className="btn btn-secondary"
                  style={{
                    padding: "0.4rem 0.8rem",
                    fontSize: "0.8rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem"
                  }}
                  title="Logout Session"
                >
                  <LogOut size={14} /> Logout
                </button>
              </form>
            </div>
          ) : (
            <Link
              href={`/tenant/${tenantSlug}/login`}
              className="btn btn-primary"
              style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem", textDecoration: "none" }}
            >
              Sign In
            </Link>
          )}

          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Workspace */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", padding: "1.5rem" }}>
        {children}
      </main>

      {/* Tenant Footer */}
      <footer
        style={{
          textAlign: "center",
          padding: "1rem",
          borderTop: "1px solid var(--border-glass)",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          marginTop: "auto"
        }}
      >
        © 2026 {tenant.name}. Powered by ParkEasy SaaS.
      </footer>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getCurrentUser, getEarningsReport } from "@/lib/actions";
import { formatCurrency, formatDisplayDate } from "@/lib/utils";
import CsvExportButton, { TicketRow } from "@/components/CsvExportButton";
import PrintButton from "@/components/PrintButton";
import ReportFilterForm from "@/components/ReportFilterForm";
import Link from "next/link";
import { TrendingUp, CalendarDays, Receipt, CreditCard, ChevronLeft } from "lucide-react";
import React from "react";

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ range?: string; date?: string }>;
}) {
  const { tenantSlug } = await params;
  const { range, date } = await searchParams;

  const user = await getCurrentUser();

  // 1. Authenticate user
  if (!user || user.role !== "ADMIN" || user.tenantSlug !== tenantSlug) {
    redirect(`/tenant/${tenantSlug}/login`);
  }

  // 2. Fallbacks for date queries
  const now = new Date();
  const selectedRange = (range || "daily") as "daily" | "monthly" | "yearly";
  
  let selectedDate = date;
  if (!selectedDate) {
    if (selectedRange === "daily") {
      selectedDate = now.toISOString().slice(0, 10);
    } else if (selectedRange === "monthly") {
      selectedDate = now.toISOString().slice(0, 7);
    } else {
      selectedDate = now.getFullYear().toString();
    }
  }

  // 3. Query aggregations from Server Action
  const reportRes = await getEarningsReport(user.tenantId, selectedRange, selectedDate);
  
  if (!reportRes.success || !reportRes.summary || !reportRes.vehicleBreakdown || !reportRes.paymentBreakdown || !reportRes.tickets) {
    return <div>Failed to load financial reports.</div>;
  }

  const { summary, vehicleBreakdown, paymentBreakdown, tickets } = reportRes;

  return (
    <div style={{ maxWidth: "1200px", width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* Page Header (No Print) */}
      <div className="no-print" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Link href={`/tenant/${tenantSlug}/admin`} className="btn btn-secondary" style={{ padding: "0.5rem", borderRadius: "50%" }}>
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              Financial Accounting Center
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
              Query, audit, and export dynamic parking lot revenue statements.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          {/* Printable Layout Trigger */}
          <PrintButton />

          <CsvExportButton
            data={tickets as TicketRow[]}
            filename={`${tenantSlug}-report-${selectedRange}-${selectedDate}`}
          />
        </div>
      </div>

      {/* Date Search Filter Console (No Print) */}
      <div className="glass-panel no-print" style={{ padding: "1.5rem" }}>
        <ReportFilterForm initialRange={selectedRange} initialDate={selectedDate} />
      </div>

      {/* Report Layout */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        {/* Printable Invoice Header */}
        <div style={{ display: "none" }} className="print-header">
          <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>PARKEASY AUDIT REPORT</h1>
          <p>Tenant: {tenantSlug.toUpperCase()} | Range: {selectedRange.toUpperCase()} ({selectedDate})</p>
          <hr style={{ margin: "1rem 0", border: "0.5px solid #ccc" }} />
        </div>

        {/* Earning Metrics Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem" }}>
          <div className="glass-panel" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ background: "var(--accent-glow)", color: "var(--accent)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                Gross Revenue
              </span>
              <h3 style={{ fontSize: "1.75rem", fontWeight: 800 }}>{formatCurrency(summary.totalRevenue)}</h3>
            </div>
          </div>

          <div className="glass-panel" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ background: "var(--primary-glow)", color: "var(--primary)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>
              <Receipt size={24} />
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                Tickets Processed
              </span>
              <h3 style={{ fontSize: "1.75rem", fontWeight: 800 }}>{summary.ticketCount}</h3>
            </div>
          </div>

          <div className="glass-panel" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ background: "var(--warning-glow)", color: "var(--warning)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>
              <CalendarDays size={24} />
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                Avg ticket revenue
              </span>
              <h3 style={{ fontSize: "1.75rem", fontWeight: 800 }}>{formatCurrency(summary.averageFee)}</h3>
            </div>
          </div>
        </div>

        {/* Aggregate Distributions */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "2rem" }}>
          
          {/* Revenue by Vehicle Size */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.5rem" }}>
              Revenue by Vehicle Type
            </h4>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {Object.keys(vehicleBreakdown).map((type) => {
                const breakdown = vehicleBreakdown[type];
                const percentage = summary.totalRevenue > 0 ? Math.round((breakdown.revenue / summary.totalRevenue) * 100) : 0;
                
                return (
                  <div key={type} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 700 }}>
                      <span>{type} Size ({breakdown.count} tickets)</span>
                      <span>{formatCurrency(breakdown.revenue)} ({percentage}%)</span>
                    </div>
                    {/* SVG progress bar */}
                    <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "9999px", overflow: "hidden" }}>
                      <div style={{ width: `${percentage}%`, height: "100%", background: "var(--primary)", borderRadius: "9999px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Revenue by Payment Method */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.5rem" }}>
              Revenue by Payment Method
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {Object.keys(paymentBreakdown).map((method) => {
                const breakdown = paymentBreakdown[method];
                const percentage = summary.totalRevenue > 0 ? Math.round((breakdown.revenue / summary.totalRevenue) * 100) : 0;
                
                return (
                  <div key={method} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 700 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        {method === "CARD" ? <CreditCard size={14} /> : "💵"} {method}
                      </span>
                      <span>{formatCurrency(breakdown.revenue)} ({percentage}%)</span>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "9999px", overflow: "hidden" }}>
                      <div style={{ width: `${percentage}%`, height: "100%", background: "var(--accent)", borderRadius: "9999px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Detailed Transactions List */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h4 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.5rem" }}>
            Processed Transactions Log ({tickets.length})
          </h4>

          {tickets.length === 0 ? (
            <p style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              No check-out records found for the selected dates.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border-glass)", color: "var(--text-muted)", fontWeight: 700 }}>
                    <th style={{ padding: "0.75rem" }}>Ticket Number</th>
                    <th style={{ padding: "0.75rem" }}>Plate Number</th>
                    <th style={{ padding: "0.75rem" }}>Size</th>
                    <th style={{ padding: "0.75rem" }}>Checked In</th>
                    <th style={{ padding: "0.75rem" }}>Checked Out</th>
                    <th style={{ padding: "0.75rem" }}>Payment</th>
                    <th style={{ padding: "0.75rem", textAlign: "right" }}>Total Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} style={{ borderBottom: "1px solid var(--border-glass)" }}>
                      <td style={{ padding: "0.75rem", fontFamily: "monospace", fontWeight: 700 }}>{t.ticketNumber}</td>
                      <td style={{ padding: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>{t.vehicleNumber}</td>
                      <td style={{ padding: "0.75rem" }}>{t.vehicleType}</td>
                      <td style={{ padding: "0.75rem" }}>{formatDisplayDate(t.entryTime)}</td>
                      <td style={{ padding: "0.75rem" }}>{t.exitTime ? formatDisplayDate(t.exitTime) : "N/A"}</td>
                      <td style={{ padding: "0.75rem" }}>
                        <span className="badge badge-available" style={{ fontSize: "0.6rem" }}>{t.paymentMethod}</span>
                      </td>
                      <td style={{ padding: "0.75rem", textAlign: "right", fontWeight: 700, color: "var(--accent)" }}>
                        {formatCurrency(t.totalFee)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

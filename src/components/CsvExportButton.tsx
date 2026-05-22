"use client";

import { Download } from "lucide-react";

interface TicketRow {
  ticketNumber: string;
  vehicleNumber: string;
  vehicleType: string;
  totalFee: number | null;
  entryTime: Date;
  exitTime: Date | null;
  paymentMethod: string | null;
}

interface CsvExportButtonProps {
  data: TicketRow[];
  filename: string;
}

export default function CsvExportButton({ data, filename }: CsvExportButtonProps) {
  const downloadCsv = () => {
    if (!data || data.length === 0) {
      alert("No data available to export.");
      return;
    }

    // Assemble CSV headers
    const headers = [
      "Ticket Number",
      "Vehicle Plate",
      "Vehicle Type",
      "Total Fee ($)",
      "Entry Time",
      "Exit Time",
      "Payment Method",
    ];

    // Map rows
    const rows = data.map((t) => [
      t.ticketNumber,
      t.vehicleNumber,
      t.vehicleType,
      t.totalFee ?? 0,
      new Date(t.entryTime).toISOString(),
      t.exitTime ? new Date(t.exitTime).toISOString() : "N/A",
      t.paymentMethod ?? "N/A",
    ]);

    // Combine headers and rows
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map(val => `"${val}"`).join(","))].join("\n");

    // Trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={downloadCsv}
      className="btn btn-secondary"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.6rem 1rem",
        fontSize: "0.85rem",
        fontWeight: 600,
      }}
    >
      <Download size={14} /> Export CSV Sheet
    </button>
  );
}

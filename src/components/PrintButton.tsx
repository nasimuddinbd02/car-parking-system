"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn btn-secondary no-print"
      style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}
    >
      <Printer size={14} /> Print Audit
    </button>
  );
}

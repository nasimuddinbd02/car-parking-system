"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface ReportFilterFormProps {
  initialRange: string;
  initialDate: string;
}

export default function ReportFilterForm({ initialRange, initialDate }: ReportFilterFormProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [range, setRange] = useState(initialRange);
  const [date, setDate] = useState(initialDate);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("range", range);
    params.set("date", date);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleRangeChange = (newRange: string) => {
    setRange(newRange);
    
    // Auto-update date input default based on selected range
    const now = new Date();
    let newDate = "";
    if (newRange === "daily") {
      newDate = now.toISOString().slice(0, 10);
    } else if (newRange === "monthly") {
      newDate = now.toISOString().slice(0, 7);
    } else {
      newDate = now.getFullYear().toString();
    }
    setDate(newDate);

    const params = new URLSearchParams();
    params.set("range", newRange);
    params.set("date", newDate);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem", alignItems: "end" }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">Report Interval</label>
        <select
          name="range"
          value={range}
          onChange={(e) => handleRangeChange(e.target.value)}
          className="form-input"
          style={{ padding: "0.75rem" }}
        >
          <option value="daily">Daily Reports</option>
          <option value="monthly">Monthly Reports</option>
          <option value="yearly">Yearly Reports</option>
        </select>
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">Selected Date</label>
        <input
          type={range === "daily" ? "date" : range === "monthly" ? "month" : "number"}
          name="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={range === "yearly" ? 2020 : undefined}
          max={range === "yearly" ? 2050 : undefined}
          className="form-input"
          required
        />
      </div>

      <button type="submit" className="btn btn-primary" style={{ height: "45px" }}>
        Query Audit
      </button>
    </form>
  );
}

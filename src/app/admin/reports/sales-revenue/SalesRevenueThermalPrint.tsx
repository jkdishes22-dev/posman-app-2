import React from "react";
import {
  THERMAL_WIDTH_80MM,
  centerTextLine,
  padLeft,
  padRight,
  rulerLine,
  lineLabelValue,
} from "../../../shared/receiptThermalLayout";

interface PrintRow {
  date: string;
  actualRevenue: number;
  projectedRevenue: number;
  totalRevenue: number;
  billCount: number;
}

interface PrintData {
  orgTitle?: string;
  startDate?: string;
  endDate?: string;
  rows?: PrintRow[];
  totalActual?: number;
  totalProjected?: number;
  totalRevenue?: number;
  totalBills?: number;
}

const W = THERMAL_WIDTH_80MM;
const COL_DATE = 10;
const COL_TOTAL = 16;
const COL_BILLS = 4;
const SEP = "  ";

function fmtAmt(n: number): string {
  return n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function periodRow(date: string, total: number, bills: number): string {
  return (
    padRight(truncate(date, COL_DATE), COL_DATE) +
    SEP +
    padLeft(fmtAmt(total), COL_TOTAL) +
    SEP +
    padLeft(String(bills), COL_BILLS)
  );
}

function headerRow(): string {
  return (
    padRight("Date", COL_DATE) +
    SEP +
    padLeft("Total Rev (KES)", COL_TOTAL) +
    SEP +
    padLeft("Bills", COL_BILLS)
  );
}

export default function SalesRevenueThermalPrint({ bill }: { bill?: PrintData }) {
  const data: PrintData = bill ?? {};
  const rows = data.rows ?? [];

  const totalActual = data.totalActual ?? rows.reduce((s, r) => s + (r.actualRevenue || 0), 0);
  const totalProjected = data.totalProjected ?? rows.reduce((s, r) => s + (r.projectedRevenue || 0), 0);
  const totalRevenue = data.totalRevenue ?? rows.reduce((s, r) => s + (r.totalRevenue || 0), 0);
  const totalBills = data.totalBills ?? rows.reduce((s, r) => s + (r.billCount || 0), 0);

  const lines: string[] = [];

  if (data.orgTitle) lines.push(centerTextLine(data.orgTitle, W));
  lines.push(centerTextLine("Sales Revenue Report", W));
  lines.push("");
  if (data.startDate) lines.push(padLeft("From: " + data.startDate, W));
  if (data.endDate) lines.push(padLeft("  To: " + data.endDate, W));
  lines.push("");
  lines.push(rulerLine("-", W));
  lines.push(headerRow());
  lines.push(rulerLine("-", W));

  for (const row of rows) {
    lines.push(periodRow(row.date, row.totalRevenue || 0, row.billCount || 0));
  }

  if (rows.length === 0) {
    lines.push(centerTextLine("No data", W));
  }

  lines.push(rulerLine("-", W));
  lines.push(lineLabelValue("Actual Revenue:", fmtAmt(totalActual), W));
  lines.push(lineLabelValue("Projected Revenue:", fmtAmt(totalProjected), W));
  lines.push(lineLabelValue("TOTAL REVENUE:", fmtAmt(totalRevenue), W));
  lines.push(lineLabelValue("Total Bills:", String(totalBills), W));
  lines.push(rulerLine("=", W));

  const content = lines.join("\n");

  return (
    <div style={{ width: "72mm", padding: "6px 4px", fontFamily: "'Courier New', Courier, monospace", fontSize: "11px", fontWeight: 600, lineHeight: 1.35, background: "#fff", color: "#000" }}>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "inherit", fontWeight: "inherit" }}>
        {content}
      </pre>
    </div>
  );
}
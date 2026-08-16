import React from "react";
import {
  THERMAL_WIDTH_80MM,
  centerTextLine,
  padLeft,
  padRight,
  rulerLine,
  lineLabelValue,
} from "../../shared/receiptThermalLayout";

interface PrintRow {
  itemName: string;
  quantity: number;
  subtotal: number;
}

interface PrintData {
  orgTitle?: string;
  userName?: string;
  startDate?: string;
  endDate?: string;
  rows?: PrintRow[];
  totalQuantity?: number;
  totalAmount?: number;
}

const W = THERMAL_WIDTH_80MM;
const COL_NAME = 22;
const COL_QTY = 3;
const COL_AMT = 11;
const SEP = "  ";

function fmtAmt(n: number): string {
  return n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function itemRow(name: string, qty: number, amount: number): string {
  return padRight(truncate(name, COL_NAME), COL_NAME) + SEP + padLeft(String(qty), COL_QTY) + SEP + padLeft(fmtAmt(amount), COL_AMT);
}

function headerRow(): string {
  return padRight("Item", COL_NAME) + SEP + padLeft("Qty", COL_QTY) + SEP + padLeft("Amount", COL_AMT);
}

export default function MySalesReportThermalPrint({ bill }: { bill?: PrintData }) {
  const data: PrintData = bill ?? {};
  const rows = data.rows ?? [];
  const totalAmt = data.totalAmount ?? rows.reduce((s, r) => s + r.subtotal, 0);
  const totalQty = data.totalQuantity ?? rows.reduce((s, r) => s + r.quantity, 0);

  const lines: string[] = [];

  if (data.orgTitle) lines.push(centerTextLine(data.orgTitle, W));
  lines.push(centerTextLine("My Sales Report", W));
  if (data.userName) lines.push(centerTextLine(data.userName, W));
  lines.push("");
  if (data.startDate) lines.push(padLeft("From: " + data.startDate, W));
  if (data.endDate) lines.push(padLeft("  To: " + data.endDate, W));
  lines.push("");
  lines.push(rulerLine("-", W));
  lines.push(headerRow());
  lines.push(rulerLine("-", W));

  for (const row of rows) {
    lines.push(itemRow(row.itemName, row.quantity, row.subtotal));
  }

  if (rows.length === 0) {
    lines.push(centerTextLine("No data", W));
  }

  lines.push(rulerLine("-", W));
  lines.push(lineLabelValue("Total Qty:", String(totalQty), W));
  lines.push(lineLabelValue("TOTAL (KES):", fmtAmt(totalAmt), W));
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

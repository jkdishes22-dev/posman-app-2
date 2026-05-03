import { describe, it, expect } from "vitest";
import {
    centerTextLine,
    lineLabelValue,
    receiptItemTablePre,
    THERMAL_WIDTH_80MM,
} from "../../src/app/shared/receiptThermalLayout";

describe("receiptThermalLayout", () => {
  it("receiptItemTablePre aligns numeric columns", () => {
    const text = receiptItemTablePre([
      {
        quantity: 1,
        subtotal: 30,
        item: { name: "Chapati", price: 30 },
      },
      {
        quantity: 4,
        subtotal: 80,
        item: { name: "Mandazi", price: 20 },
      },
    ]);
    const lines = text.split("\n");
    expect(lines[0].length).toBe(THERMAL_WIDTH_80MM);
    expect(lines[2]).toContain("Chapati");
    expect(lines[2].trimEnd()).toMatch(/\s+1\s+30\.00\s+30\.00$/);
  });

  it("centerTextLine fits width", () => {
    expect(centerTextLine("JKPOSMAN").length).toBe(THERMAL_WIDTH_80MM);
  });

  it("lineLabelValue right-aligns amount", () => {
    const row = lineLabelValue("Total:", "KES 162.40");
    expect(row.length).toBe(THERMAL_WIDTH_80MM);
    expect(row.endsWith("KES 162.40")).toBe(true);
  });
});

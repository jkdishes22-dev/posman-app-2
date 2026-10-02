import { describe, it, expect } from "vitest";
import {
  normalizePrinterSettings,
  toPrinterSettingsPayload,
  type PrinterSettingsRaw,
} from "../../src/app/shared/printerSettings";

describe("printerSettings — allow_print_toggle", () => {
  it("defaults allow_print_toggle to false when field is absent", () => {
    const result = normalizePrinterSettings({});
    expect(result.allow_print_toggle).toBe(false);
  });

  it("defaults allow_print_toggle to false when raw is null", () => {
    const result = normalizePrinterSettings(null);
    expect(result.allow_print_toggle).toBe(false);
  });

  it("returns false when allow_print_toggle is explicitly false", () => {
    const raw: PrinterSettingsRaw = { allow_print_toggle: false };
    expect(normalizePrinterSettings(raw).allow_print_toggle).toBe(false);
  });

  it("returns true when allow_print_toggle is explicitly true", () => {
    const raw: PrinterSettingsRaw = { allow_print_toggle: true };
    expect(normalizePrinterSettings(raw).allow_print_toggle).toBe(true);
  });

  it("toPrinterSettingsPayload includes allow_print_toggle", () => {
    const normalized = normalizePrinterSettings({ allow_print_toggle: true });
    const payload = toPrinterSettingsPayload(normalized);
    expect(payload).toHaveProperty("allow_print_toggle", true);
  });

  it("toPrinterSettingsPayload preserves allow_print_toggle false", () => {
    const normalized = normalizePrinterSettings({ allow_print_toggle: false });
    const payload = toPrinterSettingsPayload(normalized);
    expect(payload).toHaveProperty("allow_print_toggle", false);
  });
});

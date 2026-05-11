/**
 * Printer settings stored under system_settings.printer_settings (JSON).
 * Legacy key was print_after_close_bill (misnamed); it now means optional auto-print on create bill.
 * Legacy mode value was "kitchen"; it is now "business" — normalizer maps old rows transparently.
 */

export type PrinterSettingsRaw = {
  print_after_create_bill?: boolean;
  /** @deprecated use print_after_create_bill — kept for migration / old DB rows */
  print_after_close_bill?: boolean;
  printer_name?: string;
  auto_print_copy_mode?: "customer" | "business" | "both" | "kitchen";
};

export type PrinterSettingsNormalized = {
  print_after_create_bill: boolean;
  printer_name: string;
  auto_print_copy_mode: "customer" | "business" | "both";
};

export function normalizePrinterSettings(raw: PrinterSettingsRaw | null | undefined): PrinterSettingsNormalized {
  if (!raw) {
    return { print_after_create_bill: false, printer_name: "", auto_print_copy_mode: "both" };
  }
  const create =
    raw.print_after_create_bill !== undefined
      ? !!raw.print_after_create_bill
      : !!raw.print_after_close_bill;
  const rawMode = raw.auto_print_copy_mode;
  const mode: PrinterSettingsNormalized["auto_print_copy_mode"] =
    rawMode === "customer" ? "customer"
    : rawMode === "business" || rawMode === "kitchen" ? "business"
    : "both";
  return {
    print_after_create_bill: create,
    printer_name: raw.printer_name || "",
    auto_print_copy_mode: mode,
  };
}

/** Payload to PUT when saving (no legacy keys). */
export function toPrinterSettingsPayload(s: PrinterSettingsNormalized): PrinterSettingsNormalized {
  return {
    print_after_create_bill: s.print_after_create_bill,
    printer_name: s.printer_name,
    auto_print_copy_mode: s.auto_print_copy_mode || "both",
  };
}
/**
 * Printer settings stored under system_settings.printer_settings (JSON).
 * Legacy key was print_after_close_bill (misnamed); it now means optional auto-print on create bill.
 */

export type PrinterSettingsRaw = {
  print_after_create_bill?: boolean;
  /** @deprecated use print_after_create_bill — kept for migration / old DB rows */
  print_after_close_bill?: boolean;
  printer_name?: string;
};

export type PrinterSettingsNormalized = {
  print_after_create_bill: boolean;
  printer_name: string;
};

export function normalizePrinterSettings(raw: PrinterSettingsRaw | null | undefined): PrinterSettingsNormalized {
  if (!raw) {
    return { print_after_create_bill: false, printer_name: "" };
  }
  const create =
    raw.print_after_create_bill !== undefined
      ? !!raw.print_after_create_bill
      : !!raw.print_after_close_bill;
  return {
    print_after_create_bill: create,
    printer_name: raw.printer_name || "",
  };
}

/** Payload to PUT when saving (no legacy keys). */
export function toPrinterSettingsPayload(s: PrinterSettingsNormalized): PrinterSettingsNormalized {
  return {
    print_after_create_bill: s.print_after_create_bill,
    printer_name: s.printer_name,
  };
}

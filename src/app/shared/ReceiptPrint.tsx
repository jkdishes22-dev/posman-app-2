import React from "react";
import {
    THERMAL_WIDTH_80MM,
    centerTextLine,
    lineLabelValue,
    receiptItemTablePre,
} from "./receiptThermalLayout";

/** Branding for thermal receipts (from organisation_settings via receipt-printer-prefs). */
export interface ReceiptBranding {
    title: string;
    tagline: string | null;
    footerLines: string[];
}

export function defaultReceiptBranding(): ReceiptBranding {
    return {
        title: "JKPOSMAN",
        tagline: "World Leader of Restaurant Software",
        footerLines: [],
    };
}

/**
 * Extra vertical space between customer and captain jobs (mm) so tear/cut has room.
 * Raster/GDI drivers may still spool oddly; this is visible whitespace on the roll.
 */
export const RECEIPT_DOUBLE_PRINT_GAP_AFTER_CUSTOMER_MM = 20;
export const RECEIPT_DOUBLE_PRINT_GAP_BEFORE_CAPTAIN_MM = 10;

/** Monospace + preformatted columns: flex/grid collapses when Windows rasterizes to many thermal drivers. */
const THERMAL_RECEIPT_CSS = `
  @page { size: 72mm auto; margin: 0; }
  .receipt-print-spacer {
    display: block;
    width: 100%;
    flex-shrink: 0;
  }
  .receipt-container {
    width: 100%;
    max-width: 72mm;
    padding: 8px 4px;
    font-family: "Courier New", Courier, Consolas, monospace;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.35;
    background: #fff;
    color: #000;
    box-sizing: border-box;
    margin: 0 auto;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt-brand-logo {
    width: 56px;
    height: auto;
    margin: 0 auto 4px auto;
    display: block;
  }
  .receipt-pre {
    font-family: "Courier New", Courier, Consolas, monospace;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.35;
    margin: 0;
    padding: 0;
    white-space: pre;
    overflow: visible;
    width: 100%;
    max-width: ${THERMAL_WIDTH_80MM}ch;
    word-wrap: normal;
    overflow-wrap: normal;
    box-sizing: border-box;
    color: #000000;
    -webkit-font-smoothing: none;
  }
  .receipt-hr {
    border: none;
    border-top: 1px solid #000;
    margin: 8px 0;
  }
  .receipt-footer-pre {
    margin-top: 10px;
    text-align: center;
  }
  @media print {
    .receipt-container {
      max-width: 100% !important;
      padding: 4px 2px !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      box-shadow: none !important;
    }
    .receipt-brand-logo { display: none !important; }
    .receipt-pre { font-size: 11px !important; font-weight: 600 !important; color: #000000 !important; }
  }
`;

const ReceiptContent = ({
    bill,
    label,
    showTotals = true,
    showTax = true,
    branding,
    spacerBeforeMm = 0,
    spacerAfterMm = 0,
}: {
    bill: any;
    label: string;
    showTotals?: boolean;
    showTax?: boolean;
    branding?: ReceiptBranding;
    /** Printable blank band before the ticket (e.g. gap before kitchen copy after customer). */
    spacerBeforeMm?: number;
    /** Printable blank band after the ticket (e.g. gap before next job / tear zone). */
    spacerAfterMm?: number;
}) => {
    const b = branding ?? defaultReceiptBranding();
    const dateObj = bill.created_at ? new Date(bill.created_at) : new Date();
    const dateStr = dateObj.toLocaleDateString();
    const timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const grossTotal = bill.bill_items?.reduce((sum: number, item: any) => sum + Number(item.subtotal), 0) || 0;
    const tax = grossTotal * 0.16;
    const finalTotal = showTax ? grossTotal + tax : grossTotal;

    const serverName =
        [bill.user?.firstName, bill.user?.lastName].filter(Boolean).join(" ").trim() || "—";
    const billId = bill.id || bill.bill_id || bill.billId || bill.bill_number || "N/A";
    const currency = bill.currency ?? "";

    const headerLines: string[] = [centerTextLine(b.title)];
    if (b.tagline) {
        headerLines.push(centerTextLine(b.tagline));
    }
    headerLines.push(
        "",
        centerTextLine(label),
        "",
        `Date: ${dateStr}   Time: ${timeStr}`,
        `Bill ID: ${billId}`,
        `Served By: ${serverName}`,
    );
    const headerPre = headerLines.join("\n");

    const itemBlock = receiptItemTablePre(bill.bill_items);

    const totalsLines =
        showTotals &&
        [
            lineLabelValue("Gross:", `${currency} ${(Number(grossTotal) || 0).toFixed(2)}`.trim()),
            ...(showTax
                ? [lineLabelValue("Tax (16%):", `${currency} ${(Number(tax) || 0).toFixed(2)}`.trim())]
                : []),
            lineLabelValue("Total:", `${currency} ${(Number(finalTotal) || 0).toFixed(2)}`.trim()),
        ].join("\n");

    const footerMid = (b.footerLines ?? []).filter(Boolean).map((line) => centerTextLine(line));
    const footerPre = ["", ...footerMid, ...(footerMid.length ? [""] : [])].concat([
        centerTextLine("********************************"),
        centerTextLine("Thank you for dining with us!"),
        centerTextLine("********************************"),
    ]).join("\n");

    const before =
        spacerBeforeMm > 0 ? (
            <div
                className="receipt-print-spacer"
                style={{ height: `${spacerBeforeMm}mm` }}
                aria-hidden
            />
        ) : null;
    const after =
        spacerAfterMm > 0 ? (
            <div
                className="receipt-print-spacer"
                style={{ height: `${spacerAfterMm}mm` }}
                aria-hidden
            />
        ) : null;

    return (
        <>
            {before}
            <div className="receipt-container">
                <div style={{ textAlign: "center", marginBottom: 6 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/icons/JKlogo-96.png"
                        alt=""
                        className="receipt-brand-logo"
                    />
                </div>
                <pre className="receipt-pre">{headerPre}</pre>
                <hr className="receipt-hr" />
                <pre className="receipt-pre">{itemBlock}</pre>
                {showTotals ? (
                    <>
                        <hr className="receipt-hr" />
                        <pre className="receipt-pre">{totalsLines}</pre>
                    </>
                ) : null}
                <pre className="receipt-pre receipt-footer-pre">{footerPre}</pre>
            </div>
            {after}
        </>
    );
};

export const CaptainOrderPrint = React.forwardRef<
    HTMLDivElement,
    {
        bill: any;
        showTax?: boolean;
        receiptBranding?: ReceiptBranding;
        spacerBeforeMm?: number;
        spacerAfterMm?: number;
    }
>(({ bill, showTax, receiptBranding, spacerBeforeMm, spacerAfterMm }, ref) => {
    if (!bill) return null;
    const taxFlag = showTax !== false;
    return (
        <>
            <style>{THERMAL_RECEIPT_CSS}</style>
            <div ref={ref}>
                <ReceiptContent
                    bill={bill}
                    label="Captain Order"
                    showTotals={false}
                    showTax={taxFlag}
                    branding={receiptBranding}
                    spacerBeforeMm={spacerBeforeMm}
                    spacerAfterMm={spacerAfterMm}
                />
            </div>
        </>
    );
});

CaptainOrderPrint.displayName = "CaptainOrderPrint";

export const CustomerCopyPrint = React.forwardRef<
    HTMLDivElement,
    {
        bill: any;
        showTax?: boolean;
        receiptBranding?: ReceiptBranding;
        spacerBeforeMm?: number;
        spacerAfterMm?: number;
    }
>(({ bill, showTax, receiptBranding, spacerBeforeMm, spacerAfterMm }, ref) => {
    if (!bill) return null;
    const taxFlag = showTax !== false;
    return (
        <>
            <style>{THERMAL_RECEIPT_CSS}</style>
            <div ref={ref}>
                <ReceiptContent
                    bill={bill}
                    label="Customer Copy"
                    showTotals={true}
                    showTax={taxFlag}
                    branding={receiptBranding}
                    spacerBeforeMm={spacerBeforeMm}
                    spacerAfterMm={spacerAfterMm}
                />
            </div>
        </>
    );
});

CustomerCopyPrint.displayName = "CustomerCopyPrint";

const ReceiptPrint = React.forwardRef<
    HTMLDivElement,
    { bill: any; showTax?: boolean; receiptBranding?: ReceiptBranding }
>(({ bill, showTax, receiptBranding }, ref) => {
    if (!bill) return null;
    const taxFlag = showTax !== false;
    return (
        <>
            <style>{THERMAL_RECEIPT_CSS}</style>
            <div ref={ref}>
                <ReceiptContent bill={bill} label="Receipt" showTotals={true} showTax={taxFlag} branding={receiptBranding} />
            </div>
        </>
    );
});

ReceiptPrint.displayName = "ReceiptPrint";

export default ReceiptPrint;

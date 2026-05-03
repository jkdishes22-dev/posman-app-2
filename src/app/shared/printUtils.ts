/**
 * Utility functions for printing receipts with timestamp-based filenames
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { CaptainOrderPrint, CustomerCopyPrint } from "./ReceiptPrint";

export interface PrintOptions {
    bill: any;
    title: string;
    type: "customer" | "captain" | "receipt";
}

export type PrintReceiptResult = {
    success: boolean;
    failureReason?: string | null;
    mode: "electron" | "browser" | "blocked" | "error";
};

/**
 * Pause between kitchen (captain) and customer jobs so the first spool job can finish
 * before the second is sent (80mm thermal, ~120mm typical ticket length).
 */
export const DOUBLE_RECEIPT_GAP_MS = 750;

export type ElectronPrintOpts = {
    /** Append ESC/POS feed + partial cut after raster content (Electron only; may be ignored by some drivers). */
    appendEscPosCut?: boolean;
    feedLinesBeforeCut?: number;
};

const defaultElectronPrintOpts: ElectronPrintOpts = {
    appendEscPosCut: true,
    feedLinesBeforeCut: 4,
};

export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Two print jobs: Captain Order (kitchen line list, no bill totals) then Customer Copy (with totals).
 * Use after create-bill auto-print and for manual Print.
 */
export async function printCaptainOrderAndCustomerCopy(
    bill: any,
    printerName: string | undefined,
    extraProps?: Record<string, unknown>,
    electronPrintOpts?: ElectronPrintOpts
): Promise<{ captain: PrintReceiptResult; customer: PrintReceiptResult }> {
    const opts = { ...defaultElectronPrintOpts, ...electronPrintOpts };
    const captain = await printReceiptWithTimestamp(
        CaptainOrderPrint,
        bill,
        "Captain Order",
        "captain",
        printerName,
        extraProps,
        opts
    );
    await delay(DOUBLE_RECEIPT_GAP_MS);
    const customer = await printReceiptWithTimestamp(
        CustomerCopyPrint,
        bill,
        "Customer Copy",
        "customer",
        printerName,
        extraProps,
        opts
    );
    return { captain, customer };
}

/**
 * Generate a timestamp-based filename for receipts
 */
export const generateReceiptFilename = (bill: any, type: string): string => {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const billId = bill.id || bill.bill_id || bill.billId || bill.bill_number || "unknown";
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD format

    return `receipt_${type}_${billId}_${dateStr}_${timestamp}.html`;
};

/**
 * Generate a user-friendly title for the print window
 */
export const generatePrintTitle = (bill: any, type: string): string => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const billId = bill.id || bill.bill_id || bill.billId || bill.bill_number || "N/A";

    return `${type.charAt(0).toUpperCase() + type.slice(1)} Copy - Bill #${billId} - ${timeStr}`;
};

/**
 * Enhanced print function with timestamp-based filenames.
 * In Electron, prints silently via IPC (no dialog).
 * In web mode, opens a print-dialog popup as fallback.
 */
export const printReceiptWithTimestamp = async (
    Component: any,
    bill: any,
    title: string,
    type: "customer" | "captain" | "receipt" = "receipt",
    printerName?: string,
    extraProps?: Record<string, any>,
    electronPrintOpts?: ElectronPrintOpts
): Promise<PrintReceiptResult> => {
    const mergedElectronOpts = { ...defaultElectronPrintOpts, ...electronPrintOpts };
    return new Promise<PrintReceiptResult>((resolve) => {
        const tempDiv = document.createElement("div");
        tempDiv.style.position = "absolute";
        tempDiv.style.left = "-9999px";
        tempDiv.style.top = "-9999px";
        document.body.appendChild(tempDiv);

        const root = ReactDOM.createRoot(tempDiv);
        root.render(React.createElement(Component, { bill, ...extraProps }));

        setTimeout(() => {
            const printContents = tempDiv.innerHTML;
            root.unmount();
            document.body.removeChild(tempDiv);

            // Electron path: silent print via main-process IPC
            const electronAPI = (window as any).electron;
            if (electronAPI?.printReceipt) {
                electronAPI
                    .printReceipt(printContents, printerName || "", mergedElectronOpts)
                    .then((outcome: { success?: boolean; failureReason?: string | null } | undefined) => {
                        const success = outcome?.success !== false;
                        resolve({
                            success,
                            failureReason: outcome?.failureReason ?? null,
                            mode: "electron",
                        });
                    })
                    .catch((err: Error) => {
                        resolve({
                            success: false,
                            failureReason: err?.message || "print IPC failed",
                            mode: "electron",
                        });
                    });
                return;
            }

            // Web fallback: open a popup and trigger the browser print dialog
            const printTitle = generatePrintTitle(bill, type);
            const win = window.open("", "", "width=350,height=600");
            if (!win) {
                alert("Pop-up blocked! Please allow pop-ups for this site and try again.");
                resolve({ success: false, failureReason: "Pop-up blocked", mode: "blocked" });
                return;
            }
            try {
                win.document.title = printTitle;
                win.document.write(`<html><head><title>${printTitle}</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body>`);
                win.document.write(printContents);
                win.document.write("</body></html>");
                win.document.close();
                win.focus();
                setTimeout(() => {
                    win.print();
                    win.close();
                    resolve({ success: true, mode: "browser" });
                }, 500);
            } catch (error: any) {
                console.error("Print error:", error);
                resolve({
                    success: false,
                    failureReason: error?.message || String(error),
                    mode: "error",
                });
            }
        }, 100);
    });
};

/**
 * Download receipt as HTML file with timestamp
 */
export const downloadReceiptAsFile = async (
    Component: any,
    bill: any,
    type: "customer" | "captain" | "receipt" = "receipt"
): Promise<void> => {
    return new Promise<void>((resolve) => {
        // Create a temporary div for the receipt
        const tempDiv = document.createElement("div");
        tempDiv.style.position = "absolute";
        tempDiv.style.left = "-9999px";
        tempDiv.style.top = "-9999px";
        document.body.appendChild(tempDiv);

        // Render the component
        const root = ReactDOM.createRoot(tempDiv);
        root.render(React.createElement(Component, { bill: bill }));

        // Wait for render, then download
        setTimeout(() => {
            const printContents = tempDiv.innerHTML;
            const filename = generateReceiptFilename(bill, type);
            const printTitle = generatePrintTitle(bill, type);

            // Create a complete HTML document
            const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>${printTitle}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: monospace; margin: 0; padding: 20px; }
        @media print {
            body { margin: 0; padding: 0; }
        }
    </style>
</head>
<body>
    ${printContents}
</body>
</html>`;

            // Create and download the file
            const blob = new Blob([htmlContent], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            // Clean up
            root.unmount();
            document.body.removeChild(tempDiv);
            resolve();
        }, 100);
    });
};

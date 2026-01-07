/**
 * Utility functions for printing receipts with timestamp-based filenames
 */

import React from "react";
import ReactDOM from "react-dom/client";

export interface PrintOptions {
    bill: any;
    title: string;
    type: "customer" | "captain" | "receipt";
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
 * Enhanced print function with timestamp-based filenames
 */
export const printReceiptWithTimestamp = async (
    Component: any,
    bill: any,
    title: string,
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

        // Wait for render, then print
        setTimeout(() => {
            const printContents = tempDiv.innerHTML;
            const filename = generateReceiptFilename(bill, type);
            const printTitle = generatePrintTitle(bill, type);

            const win = window.open("", "", "width=350,height=600");

            // Check if pop-up was blocked
            if (!win) {
                alert("Pop-up blocked! Please allow pop-ups for this site and try again.");
                // Clean up
                root.unmount();
                document.body.removeChild(tempDiv);
                resolve();
                return;
            }

            try {
                // Set the document title with timestamp
                win.document.title = printTitle;

                win.document.write("<html><head>");
                win.document.write(`<title>${printTitle}</title>`);
                win.document.write("<meta charset=\"utf-8\">");
                win.document.write("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">");
                win.document.write("</head><body>");
                win.document.write(printContents);
                win.document.write("</body></html>");
                win.document.close();
                win.focus();

                // Add a comment with the filename for reference

                setTimeout(() => {
                    win.print();
                    win.close();

                    // Clean up
                    root.unmount();
                    document.body.removeChild(tempDiv);
                    resolve();
                }, 500);
            } catch (error) {
                console.error("Print error:", error);
                // Clean up
                root.unmount();
                document.body.removeChild(tempDiv);
                resolve();
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

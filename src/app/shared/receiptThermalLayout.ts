/**
 * Fixed-width monospace receipt lines for 80mm-class thermal rolls.
 * Many models (e.g. Xprinter XP-Q807K) have ~72mm print width on 80mm paper; 48× monospace
 * at 11pt was getting clipped on the right with vendor GDI drivers. 42 columns fits that head.
 */

export const THERMAL_WIDTH_80MM = 42;

export function padLeft(s: string, w: number): string {
    const t = String(s);
    return t.length >= w ? t.slice(-w) : " ".repeat(w - t.length) + t;
}

export function padRight(s: string, w: number): string {
    const t = String(s);
    return t.length >= w ? t.slice(0, w) : t + " ".repeat(w - t.length);
}

export function centerTextLine(text: string, width = THERMAL_WIDTH_80MM): string {
    const t = text.trim();
    if (t.length >= width) return t.slice(0, width);
    const pad = Math.max(0, Math.floor((width - t.length) / 2));
    return " ".repeat(pad) + t + " ".repeat(width - pad - t.length);
}

export function rulerLine(char = "-", width = THERMAL_WIDTH_80MM): string {
    return char.repeat(width);
}

/** One line: label left, amount right (reference receipt style). */
export function lineLabelValue(label: string, value: string, width = THERMAL_WIDTH_80MM): string {
    const val = String(value);
    const maxLabel = Math.max(4, width - val.length - 1);
    const lab = label.length > maxLabel ? `${label.slice(0, maxLabel - 1)}*` : label;
    return padRight(lab, width - val.length) + val;
}

const COL_IDX = 3;
const COL_NAME = 16;
const COL_QTY = 4;
const COL_PRICE = 7;
const COL_SUB = 8;

export function receiptItemTablePre(billItems: unknown[] | undefined): string {
    const items = Array.isArray(billItems) ? billItems : [];
    const lines: string[] = [];
    lines.push(
        padRight("#", COL_IDX) +
            " " +
            padRight("Item", COL_NAME) +
            " " +
            padLeft("Qty", COL_QTY) +
            " " +
            padLeft("Price", COL_PRICE) +
            " " +
            padLeft("Total", COL_SUB),
    );
    lines.push(rulerLine("-"));
    items.forEach((raw, index) => {
        const row = raw as {
            quantity?: number | string;
            subtotal?: number | string;
            item?: { name?: string; price?: number | string };
        };
        const name = row.item?.name ?? "—";
        const qty = row.quantity ?? "";
        const price = row.item?.price ?? "";
        const sub = row.subtotal ?? "";
        const priceNum = Number(price);
        const subNum = Number(sub);
        const priceStr = Number.isFinite(priceNum) ? priceNum.toFixed(2) : String(price);
        const subStr = Number.isFinite(subNum) ? subNum.toFixed(2) : String(sub);
        const nm = name.length > COL_NAME ? name.slice(0, COL_NAME) : name;
        lines.push(
            padRight(`${index + 1}.`, COL_IDX) +
                " " +
                padRight(nm, COL_NAME) +
                " " +
                padLeft(String(qty), COL_QTY) +
                " " +
                padLeft(priceStr, COL_PRICE) +
                " " +
                padLeft(subStr, COL_SUB),
        );
    });
    return lines.join("\n");
}

import React from "react";

/** Shared 80mm thermal styles: flex rows survive raster/GDI better than HTML tables. */
const THERMAL_RECEIPT_CSS = `
  @page { size: 80mm auto; margin: 0; }
  .receipt-container {
    width: 100%;
    max-width: 72mm;
    padding: 8px 6px;
    font-family: "Courier New", Courier, Consolas, monospace;
    font-size: 11px;
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
  .receipt-meta-row {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 4px 8px;
    font-size: 11px;
    margin-bottom: 4px;
  }
  .receipt-hr {
    border: none;
    border-top: 1px solid #000;
    margin: 8px 0;
  }
  .receipt-grid-head,
  .receipt-grid-row {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    width: 100%;
    gap: 4px;
    font-size: 11px;
    box-sizing: border-box;
  }
  .receipt-grid-head {
    font-weight: bold;
    border-bottom: 1px solid #000;
    padding-bottom: 4px;
    margin-bottom: 4px;
  }
  .receipt-grid-row {
    padding: 3px 0;
    border-bottom: 1px dotted #999;
  }
  .receipt-col-no {
    flex: 0 0 1.4rem;
    min-width: 1.4rem;
    text-align: left;
  }
  .receipt-col-item {
    flex: 1 1 6rem;
    min-width: 0;
    text-align: left;
    word-break: break-word;
    overflow-wrap: anywhere;
    padding-right: 2px;
  }
  .receipt-col-qty {
    flex: 0 0 1.6rem;
    text-align: right;
  }
  .receipt-col-price {
    flex: 0 0 2.4rem;
    text-align: right;
  }
  .receipt-col-sub {
    flex: 0 0 2.8rem;
    text-align: right;
  }
  .receipt-totals {
    text-align: right;
    font-weight: bold;
    margin: 6px 0;
    font-size: 12px;
  }
  .receipt-footer {
    text-align: center;
    margin-top: 10px;
    font-size: 11px;
    line-height: 1.5;
  }
  .receipt-stars {
    letter-spacing: 0.02em;
    word-break: break-all;
    max-width: 100%;
    margin: 4px 0;
  }
  @media print {
    .receipt-container {
      max-width: 100% !important;
      padding: 4px 4px !important;
      font-size: 11px !important;
      box-shadow: none !important;
    }
    .receipt-brand-logo { display: none !important; }
  }
`;

const ReceiptContent = ({ bill, label, showTotals = true, showTax = true }: { bill: any; label: string; showTotals?: boolean; showTax?: boolean }) => {
    const dateObj = bill.created_at ? new Date(bill.created_at) : new Date();
    const dateStr = dateObj.toLocaleDateString();
    const timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const grossTotal = bill.bill_items?.reduce((sum: number, item: any) => sum + Number(item.subtotal), 0) || 0;
    const tax = grossTotal * 0.16;
    const finalTotal = showTax ? grossTotal + tax : grossTotal;

    const billId = bill.id || bill.bill_id || bill.billId || bill.bill_number || "N/A";

    return (
        <div className="receipt-container">
            <div style={{ textAlign: "center", marginBottom: 6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/icons/JKlogo-96.png"
                    alt=""
                    className="receipt-brand-logo"
                />
                <div style={{ fontWeight: "bold", fontSize: 18, letterSpacing: 0.5 }}>JKPOSMAN</div>
                <div style={{ fontSize: 10, marginBottom: 2 }}>World Leader of Restaurant Software</div>
                <div style={{ fontWeight: "bold", fontSize: 14, margin: "8px 0 4px 0", color: "#111" }}>{label}</div>
            </div>
            <div className="receipt-meta-row">
                <span>Date: {dateStr}</span>
                <span>Time: {timeStr}</span>
            </div>
            <div style={{ fontSize: 11, marginBottom: 2 }}>Bill ID: <b>{billId}</b></div>
            <div style={{ fontSize: 11, marginBottom: 2 }}>Served By: {bill.user?.firstName ?? "—"}</div>
            <hr className="receipt-hr" />

            <div className="receipt-grid-head">
                <span className="receipt-col-no">#</span>
                <span className="receipt-col-item">Item</span>
                <span className="receipt-col-qty">Qty</span>
                <span className="receipt-col-price">Price</span>
                <span className="receipt-col-sub">Sub</span>
            </div>
            {bill.bill_items?.map((item: any, index: number) => (
                <div key={item.id ?? index} className="receipt-grid-row">
                    <span className="receipt-col-no">{index + 1}.</span>
                    <span className="receipt-col-item">{item.item?.name ?? "—"}</span>
                    <span className="receipt-col-qty">{item.quantity}</span>
                    <span className="receipt-col-price">{item.item?.price ?? ""}</span>
                    <span className="receipt-col-sub">{item.subtotal}</span>
                </div>
            ))}
            <hr className="receipt-hr" />
            {showTotals && (
                <>
                    <div className="receipt-totals">
                        Gross: {bill.currency} {(Number(grossTotal) || 0).toFixed(2)}
                    </div>
                    {showTax && (
                        <div className="receipt-totals" style={{ fontSize: 11 }}>
                            Tax (16%): {bill.currency} {(Number(tax) || 0).toFixed(2)}
                        </div>
                    )}
                    <div className="receipt-totals" style={{ fontSize: 14 }}>
                        Total: {bill.currency} {(Number(finalTotal) || 0).toFixed(2)}
                    </div>
                </>
            )}
            <div className="receipt-footer">
                <div className="receipt-stars">********************************</div>
                <div>Thank you for dining with us!</div>
                <div className="receipt-stars">********************************</div>
            </div>
        </div>
    );
};

export const CaptainOrderPrint = React.forwardRef<HTMLDivElement, { bill: any; showTax?: boolean }>(({ bill, showTax }, ref) => {
    if (!bill) return null;
    const taxFlag = showTax !== false;
    return (
        <>
            <style>{THERMAL_RECEIPT_CSS}</style>
            <div ref={ref}>
                <ReceiptContent bill={bill} label="Captain Order" showTotals={false} showTax={taxFlag} />
            </div>
        </>
    );
});

CaptainOrderPrint.displayName = "CaptainOrderPrint";

export const CustomerCopyPrint = React.forwardRef<HTMLDivElement, { bill: any; showTax?: boolean }>(({ bill, showTax }, ref) => {
    if (!bill) return null;
    const taxFlag = showTax !== false;
    return (
        <>
            <style>{THERMAL_RECEIPT_CSS}</style>
            <div ref={ref}>
                <ReceiptContent bill={bill} label="Customer Copy" showTotals={true} showTax={taxFlag} />
            </div>
        </>
    );
});

CustomerCopyPrint.displayName = "CustomerCopyPrint";

const ReceiptPrint = React.forwardRef<HTMLDivElement, { bill: any; showTax?: boolean }>(({ bill, showTax }, ref) => {
    if (!bill) return null;
    const taxFlag = showTax !== false;
    return (
        <>
            <style>{THERMAL_RECEIPT_CSS}</style>
            <div ref={ref}>
                <ReceiptContent bill={bill} label="Receipt" showTotals={true} showTax={taxFlag} />
            </div>
        </>
    );
});

ReceiptPrint.displayName = "ReceiptPrint";

export default ReceiptPrint;

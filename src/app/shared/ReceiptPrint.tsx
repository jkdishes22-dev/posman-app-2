import React from "react";

const ReceiptContent = ({ bill, label, showTotals = true }: { bill: any; label: string; showTotals?: boolean }) => {
    const dateObj = bill.created_at ? new Date(bill.created_at) : new Date();
    const dateStr = dateObj.toLocaleDateString();
    const timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const grossTotal = bill.bill_items?.reduce((sum, item) => sum + Number(item.subtotal), 0) || 0;
    const tax = grossTotal * 0.16;
    const finalTotal = grossTotal + tax;

    // Get the bill ID from various possible locations
    const billId = bill.id || bill.bill_id || bill.billId || bill.bill_number || "N/A";

    return (
        <div className="receipt-container">
            <div style={{ textAlign: "center", marginBottom: 4 }}>
                <img
                    src="/icons/JKlogo-96.png"
                    alt="JKPOSMAN Logo"
                    style={{ width: 64, height: "auto", margin: "0 auto 4px auto", display: "block" }}
                />
                <div style={{ fontWeight: "bold", fontSize: 22, letterSpacing: 1 }}>JKPOSMAN</div>
                <div style={{ fontSize: 12, marginBottom: 2 }}>World Leader of Restaurant Software</div>
                <div style={{ fontWeight: "bold", fontSize: 16, margin: "8px 0 4px 0", color: "#333" }}>{label}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span>Date: {dateStr}</span>
                <span>Time: {timeStr}</span>
            </div>
            <div style={{ fontSize: 12, marginBottom: 2 }}>Bill ID: <b>{billId}</b></div>
            <div style={{ fontSize: 12, marginBottom: 2 }}>Served By: {bill.user?.firstName}</div>
            <hr style={{ margin: "8px 0" }} />
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ borderBottom: "1px solid #000" }}>
                        <th style={{ textAlign: "left", padding: "1px 1px", width: "10%" }}>No.</th>
                        <th style={{ textAlign: "left", padding: "1px 1px", width: "50%" }}>Item</th>
                        <th style={{ textAlign: "left", padding: "1px 1px", width: "15%" }}>Qty</th>
                        <th style={{ textAlign: "right", padding: "1px 1px", width: "25%" }}>Price</th>
                        <th style={{ textAlign: "right", padding: "1px 1px", width: "25%" }}>Subt</th>
                    </tr>
                </thead>
                <tbody>
                    {bill.bill_items?.map((item, index) => (
                        <tr key={item.id}>
                            <td style={{ textAlign: "left", padding: "1px 1px" }}>{index + 1}.</td>
                            <td style={{ textAlign: "left", padding: "1px 1px" }}>{item.item?.name}</td>
                            <td style={{ textAlign: "left", padding: "1px 1px" }}>{item.quantity}</td>
                            <td style={{ textAlign: "right", padding: "1px 1px" }}>{item.item?.price}</td>
                            <td style={{ textAlign: "right", padding: "1px 1px" }}>{item.subtotal}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <hr style={{ margin: "8px 0" }} />
            {showTotals && (
                <>
                    <div style={{ textAlign: "right", fontWeight: "bold", fontSize: 16, margin: "8px 0" }}>
                        Gross Total: {bill.currency} {(Number(grossTotal) || 0).toFixed(2)}
                    </div>
                    <div style={{ textAlign: "right", fontWeight: "bold", fontSize: 14, margin: "8px 0" }}>
                        Tax (16%): {bill.currency} {(Number(tax) || 0).toFixed(2)}
                    </div>
                    <div style={{ textAlign: "right", fontWeight: "bold", fontSize: 18, margin: "8px 0" }}>
                        Total: {bill.currency} {(Number(finalTotal) || 0).toFixed(2)}
                    </div>
                </>
            )}
            <div style={{ textAlign: "center", marginTop: 12, fontSize: 14 }}>
                ******************************************<br />
                Thank you for dining with us!<br />
                ******************************************
            </div>
        </div>
    );
};

// Captain Order Print Component
export const CaptainOrderPrint = React.forwardRef<HTMLDivElement, { bill: any }>(({ bill }, ref) => {
    if (!bill) return null;
    return (
        <>
            <style>{`
                .receipt-container {
                    width: 100%;
                    max-width: 320px;
                    padding: 1em;
                    font-family: monospace;
                    background: #fff;
                    color: #000;
                    box-sizing: border-box;
                    margin: 0 auto;
                    position: relative;
                }
                @media print {
                    .receipt-container {
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 0.5cm !important;
                        font-size: 12pt !important;
                        box-shadow: none !important;
                        background: #fff !important;
                        margin: 0 auto !important;
                    }
                }
            `}</style>
            <div ref={ref}>
                <ReceiptContent bill={bill} label="Captain Order" showTotals={false} />
            </div>
        </>
    );
});

CaptainOrderPrint.displayName = "CaptainOrderPrint";

// Customer Copy Print Component
export const CustomerCopyPrint = React.forwardRef<HTMLDivElement, { bill: any }>(({ bill }, ref) => {
    if (!bill) return null;
    return (
        <>
            <style>{`
                .receipt-container {
                    width: 100%;
                    max-width: 320px;
                    padding: 1em;
                    font-family: monospace;
                    background: #fff;
                    color: #000;
                    box-sizing: border-box;
                    margin: 0 auto;
                    position: relative;
                }
                @media print {
                    .receipt-container {
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 0.5cm !important;
                        font-size: 12pt !important;
                        box-shadow: none !important;
                        background: #fff !important;
                        margin: 0 auto !important;
                    }
                }
            `}</style>
            <div ref={ref}>
                <ReceiptContent bill={bill} label="Customer Copy" showTotals={true} />
            </div>
        </>
    );
});

CustomerCopyPrint.displayName = "CustomerCopyPrint";

// Legacy component for backward compatibility
const ReceiptPrint = React.forwardRef<HTMLDivElement, { bill: any }>(({ bill }, ref) => {
    if (!bill) return null;
    return (
        <>
            <style>{`
                .receipt-container {
                    width: 100%;
                    max-width: 320px;
                    padding: 1em;
                    font-family: monospace;
                    background: #fff;
                    color: #000;
                    box-sizing: border-box;
                    margin: 0 auto;
                    position: relative;
                }
                @media print {
                    .receipt-container {
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 0.5cm !important;
                        font-size: 12pt !important;
                        box-shadow: none !important;
                        background: #fff !important;
                        margin: 0 auto !important;
                    }
                }
            `}</style>
            <div ref={ref}>
                <ReceiptContent bill={bill} label="Receipt" showTotals={true} />
            </div>
        </>
    );
});

ReceiptPrint.displayName = "ReceiptPrint";

export default ReceiptPrint; 
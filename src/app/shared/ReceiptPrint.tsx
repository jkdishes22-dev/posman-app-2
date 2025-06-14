import React from "react";

const ReceiptPrint = React.forwardRef<HTMLDivElement, { bill: any }>(({ bill }, ref) => {
    if (!bill) return null;
    const dateObj = bill.created_at ? new Date(bill.created_at) : new Date();
    const dateStr = dateObj.toLocaleDateString();
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const grossTotal = bill.bill_items?.reduce((sum, item) => sum + Number(item.subtotal), 0) || 0;
    const tax = grossTotal * 0.16;
    const finalTotal = grossTotal + tax;
    return (
        <div
            ref={ref}
            style={{
                width: 320,
                padding: 16,
                fontFamily: 'monospace',
                background: '#fff',
                color: '#000',
                boxSizing: 'border-box',
                margin: '0 auto',
                position: 'relative',
            }}
        >
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <img
                    src="/icons/JKlogo-96.png"
                    alt="JKPOSMAN Logo"
                    style={{ width: 64, height: 'auto', margin: '0 auto 4px auto', display: 'block' }}
                />
                <div style={{ fontWeight: 'bold', fontSize: 22, letterSpacing: 1 }}>JKPOSMAN</div>
                <div style={{ fontSize: 12, marginBottom: 2 }}>World Leader of Restaurant Software</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span>Date: {dateStr}</span>
                <span>Time: {timeStr}</span>
            </div>
            <div style={{ fontSize: 12, marginBottom: 2 }}>Bill ID: <b>{bill.id || '-'}</b></div>
            <div style={{ fontSize: 12, marginBottom: 2 }}>Served By: {bill.user?.firstName}</div>
            <hr style={{ margin: '8px 0' }} />
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                        <th style={{ textAlign: 'left', padding: '1px 1px' }}>Item</th>
                        <th style={{ textAlign: 'left', padding: '1px 1px' }}>Qty</th>
                        <th style={{ textAlign: 'right', padding: '1px 1px' }}>Price</th>
                        <th style={{ textAlign: 'right', padding: '1px 1px' }}>Subt</th>
                    </tr>
                </thead>
                <tbody>
                    {bill.bill_items?.map((item) => (
                        <tr key={item.id}>
                            <td style={{ textAlign: 'left', padding: '1px 1px' }}>{item.item?.name}</td>
                            <td style={{ textAlign: 'left', padding: '1px 1px' }}>{item.quantity}</td>
                            <td style={{ textAlign: 'right', padding: '1px 1px' }}>{item.item?.price}</td>
                            <td style={{ textAlign: 'right', padding: '1px 1px' }}>{item.subtotal}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <hr style={{ margin: '8px 0' }} />
            <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: 16, margin: '8px 0' }}>
                Gross Total: {bill.currency} {grossTotal.toFixed(2)}
            </div>
            <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: 14, margin: '8px 0' }}>
                Tax (16%): {bill.currency} {tax.toFixed(2)}
            </div>
            <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: 18, margin: '8px 0' }}>
                Total: {bill.currency} {finalTotal.toFixed(2)}
            </div>
            <div style={{ textAlign: 'center', marginTop: 12, fontSize: 14 }}>
                ******************************************<br />
                Thank you for dining with us!<br />
                ******************************************
            </div>
        </div>
    );
});

export default ReceiptPrint; 
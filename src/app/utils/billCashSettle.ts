/**
 * Fires a cash settlement for a newly created bill without blocking the caller.
 * On network/API failure the bill stays pending — the user can submit manually from My Sales.
 */
export function fireCashSettle(
  apiCall: (url: string, options: Record<string, unknown>) => Promise<unknown>,
  billId: number,
  total: number,
): void {
  apiCall("/api/bills/submit", {
    method: "POST",
    body: JSON.stringify({
      paymentMethod: "cash",
      cashAmount: total,
      mpesaAmount: 0,
      mpesaCode: null,
      pendingAmount: 0,
      billId,
    }),
  }).catch(() => {});
}

/**
 * Fires an M-Pesa settlement for a newly created bill without blocking the caller.
 * On network/API failure the bill stays pending — the user can submit manually from My Sales.
 */
export function fireMpesaSettle(
  apiCall: (url: string, options: Record<string, unknown>) => Promise<unknown>,
  billId: number,
  total: number,
  mpesaCode: string,
): void {
  apiCall("/api/bills/submit", {
    method: "POST",
    body: JSON.stringify({
      paymentMethod: "mpesa",
      cashAmount: 0,
      mpesaAmount: total,
      mpesaCode,
      pendingAmount: 0,
      billId,
    }),
  }).catch(() => {});
}

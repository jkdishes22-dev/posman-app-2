/**
 * Submit Bill modal payment math — shared by UI and unit tests.
 */

export type SubmitBillPaymentMethod = "cash" | "mpesa" | "cash_mpesa";

/** Sum of cash + M-Pesa amounts according to the selected payment method (matches submit-bill.tsx). */
export function computeTotalPaidFromPaymentFields(
  paymentMethod: string,
  cashAmountStr: string,
  mpesaAmountStr: string,
): number {
  const cashPart =
    paymentMethod === "cash" || paymentMethod === "cash_mpesa"
      ? Number(cashAmountStr) || 0
      : 0;
  const mpesaPart =
    paymentMethod === "mpesa" || paymentMethod === "cash_mpesa"
      ? Number(mpesaAmountStr) || 0
      : 0;
  return cashPart + mpesaPart;
}

export function computePendingAmount(billTotal: number, totalPaid: number): number {
  const t = Number(billTotal) || 0;
  const p = Number(totalPaid) || 0;
  return t - p;
}

/** Same tolerance as submit handler / modal validation. */
export function isSubmitBillPaymentBalanced(
  billTotal: number,
  totalPaid: number,
  epsilon = 0.01,
): boolean {
  return Math.abs((Number(billTotal) || 0) - (Number(totalPaid) || 0)) <= epsilon;
}

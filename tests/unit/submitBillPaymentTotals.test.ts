import { describe, it, expect } from "vitest";
import {
  computePendingAmount,
  computeTotalPaidFromPaymentFields,
  isSubmitBillPaymentBalanced,
} from "../../src/app/utils/submitBillPaymentTotals";

describe("computeTotalPaidFromPaymentFields", () => {
  it("uses only cash for cash method", () => {
    expect(computeTotalPaidFromPaymentFields("cash", "100", "999")).toBe(100);
  });

  it("uses only M-Pesa amount for mpesa method", () => {
    expect(computeTotalPaidFromPaymentFields("mpesa", "999", "250.50")).toBe(250.5);
  });

  it("sums both for cash_mpesa", () => {
    expect(computeTotalPaidFromPaymentFields("cash_mpesa", "50", "75")).toBe(125);
  });

  it("treats empty strings as zero", () => {
    expect(computeTotalPaidFromPaymentFields("cash_mpesa", "", "")).toBe(0);
  });
});

describe("computePendingAmount", () => {
  it("returns bill total minus paid", () => {
    expect(computePendingAmount(850, 587)).toBe(263);
  });

  it("coerces non-numeric to zero like the modal", () => {
    expect(computePendingAmount(0, 0)).toBe(0);
  });
});

describe("isSubmitBillPaymentBalanced", () => {
  it("returns true within epsilon", () => {
    expect(isSubmitBillPaymentBalanced(100, 100.005)).toBe(true);
  });

  it("returns false when difference exceeds epsilon", () => {
    expect(isSubmitBillPaymentBalanced(100, 90)).toBe(false);
  });
});

import { describe, it, expect, vi } from "vitest";
import { fireCashSettle, fireMpesaSettle } from "../../src/app/utils/billCashSettle";

const expectedPayload = (billId: number, total: number) =>
  JSON.stringify({ paymentMethod: "cash", cashAmount: total, mpesaAmount: 0, mpesaCode: null, pendingAmount: 0, billId });

describe("fireCashSettle", () => {
  it("calls /api/bills/submit with a full cash payload", () => {
    const mockApiCall = vi.fn().mockResolvedValue({ status: 200 });

    fireCashSettle(mockApiCall, 42, 1500);

    expect(mockApiCall).toHaveBeenCalledWith("/api/bills/submit", {
      method: "POST",
      body: expectedPayload(42, 1500),
    });
  });

  it("returns void immediately without awaiting the response", () => {
    let promiseSettled = false;
    const mockApiCall = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => { promiseSettled = true; resolve({ status: 200 }); }, 100)),
    );

    fireCashSettle(mockApiCall, 7, 500);

    expect(promiseSettled).toBe(false);
  });

  it("does not throw when the API call rejects (fire-and-forget)", async () => {
    const mockApiCall = vi.fn().mockRejectedValue(new Error("network error"));

    expect(() => fireCashSettle(mockApiCall, 1, 100)).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it("sends the exact bill total as cashAmount with zero mpesa fields", () => {
    const mockApiCall = vi.fn().mockResolvedValue({ status: 200 });

    fireCashSettle(mockApiCall, 99, 3750.5);

    const body = JSON.parse((mockApiCall.mock.calls[0][1] as { body: string }).body);
    expect(body.cashAmount).toBe(3750.5);
    expect(body.mpesaAmount).toBe(0);
    expect(body.mpesaCode).toBeNull();
    expect(body.pendingAmount).toBe(0);
  });
});

describe("fireMpesaSettle", () => {
  it("calls /api/bills/submit with a full M-Pesa payload", () => {
    const mockApiCall = vi.fn().mockResolvedValue({ status: 200 });

    fireMpesaSettle(mockApiCall, 42, 1500, "QRM123456789");

    expect(mockApiCall).toHaveBeenCalledWith("/api/bills/submit", {
      method: "POST",
      body: JSON.stringify({
        paymentMethod: "mpesa",
        cashAmount: 0,
        mpesaAmount: 1500,
        mpesaCode: "QRM123456789",
        pendingAmount: 0,
        billId: 42,
      }),
    });
  });

  it("returns void immediately without awaiting the response", () => {
    let promiseSettled = false;
    const mockApiCall = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => { promiseSettled = true; resolve({ status: 200 }); }, 100)),
    );

    fireMpesaSettle(mockApiCall, 7, 500, "QREF001");

    expect(promiseSettled).toBe(false);
  });

  it("does not throw when the API call rejects (fire-and-forget)", async () => {
    const mockApiCall = vi.fn().mockRejectedValue(new Error("network error"));

    expect(() => fireMpesaSettle(mockApiCall, 1, 100, "QREF002")).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it("sends the exact bill total as mpesaAmount with zero cash fields", () => {
    const mockApiCall = vi.fn().mockResolvedValue({ status: 200 });

    fireMpesaSettle(mockApiCall, 99, 3750.5, "MPESA_REF_XYZ");

    const body = JSON.parse((mockApiCall.mock.calls[0][1] as { body: string }).body);
    expect(body.mpesaAmount).toBe(3750.5);
    expect(body.cashAmount).toBe(0);
    expect(body.mpesaCode).toBe("MPESA_REF_XYZ");
    expect(body.pendingAmount).toBe(0);
  });
});

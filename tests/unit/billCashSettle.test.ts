import { describe, it, expect, vi } from "vitest";
import { fireCashSettle } from "../../src/app/utils/billCashSettle";

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

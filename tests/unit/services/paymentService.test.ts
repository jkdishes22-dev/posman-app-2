import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentService } from "@backend/service/PaymentService";
import { PaymentType } from "@backend/entities/Payment";
import {
  createMockDataSource,
  createMockRepository,
} from "../mocks/createMockDataSource";

describe("PaymentService", () => {
  let mockPaymentRepo: ReturnType<typeof createMockRepository>;
  let mockBillPaymentRepo: ReturnType<typeof createMockRepository>;
  let service: PaymentService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPaymentRepo = createMockRepository();
    mockBillPaymentRepo = createMockRepository();
    const mockDs = createMockDataSource({
      Payment: mockPaymentRepo,
      BillPayment: mockBillPaymentRepo,
    });
    service = new PaymentService(mockDs as any);
  });

  describe("createPayment", () => {
    it("creates and saves a payment with the given payload", async () => {
      const payload = { amount: 500, paymentType: PaymentType.CASH };
      const created = { ...payload };
      const saved = { id: 1, ...payload };
      mockPaymentRepo.create.mockReturnValue(created);
      mockPaymentRepo.save.mockResolvedValue(saved);

      const result = await service.createPayment(payload);

      expect(mockPaymentRepo.create).toHaveBeenCalledWith(payload);
      expect(mockPaymentRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(saved);
    });
  });

  describe("createBillPayment", () => {
    it("creates and saves a bill payment with the given payload", async () => {
      const payload = { bill: { id: 1 }, payment: { id: 2 } };
      const created = { ...payload };
      const saved = { id: 10, ...payload };
      mockBillPaymentRepo.create.mockReturnValue(created);
      mockBillPaymentRepo.save.mockResolvedValue(saved);

      const result = await service.createBillPayment(payload);

      expect(mockBillPaymentRepo.create).toHaveBeenCalledWith(payload);
      expect(result).toEqual(saved);
    });
  });

  describe("checkMpesaReferenceExists", () => {
    it("returns false when no payment with that reference exists", async () => {
      mockPaymentRepo.findOne.mockResolvedValue(null);

      const result = await service.checkMpesaReferenceExists("ABC123", 1);

      expect(result).toBe(false);
    });

    it("returns false when reference exists but only for the same bill", async () => {
      const billPayments = [{ bill: { id: 1 } }];
      mockPaymentRepo.findOne.mockResolvedValue({
        id: 99,
        paymentType: PaymentType.MPESA,
        bill_payments: Promise.resolve(billPayments),
      });

      const result = await service.checkMpesaReferenceExists("ABC123", 1);

      expect(result).toBe(false);
    });

    it("returns true when reference is used in a different bill", async () => {
      const billPayments = [{ bill: { id: 99 } }];
      mockPaymentRepo.findOne.mockResolvedValue({
        id: 10,
        paymentType: PaymentType.MPESA,
        bill_payments: Promise.resolve(billPayments),
      });

      const result = await service.checkMpesaReferenceExists("ABC123", 1);

      expect(result).toBe(true);
    });
  });
});

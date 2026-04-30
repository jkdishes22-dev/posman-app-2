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
    it("returns false when normalized reference does not exist", async () => {
      const qb = mockPaymentRepo.createQueryBuilder();
      qb.getCount.mockResolvedValue(0);

      const result = await service.checkMpesaReferenceExists("ABC123", 1);

      expect(result).toBe(false);
      expect(mockPaymentRepo.createQueryBuilder).toHaveBeenCalledWith("payment");
      expect(qb.andWhere).toHaveBeenCalledWith(
        "UPPER(TRIM(payment.reference)) = :normalizedReference",
        { normalizedReference: "ABC123" }
      );
    });

    it("returns true when normalized reference already exists", async () => {
      const qb = mockPaymentRepo.createQueryBuilder();
      qb.getCount.mockResolvedValue(1);

      const result = await service.checkMpesaReferenceExists("  abc123  ", 1);

      expect(result).toBe(true);
      expect(qb.andWhere).toHaveBeenCalledWith(
        "UPPER(TRIM(payment.reference)) = :normalizedReference",
        { normalizedReference: "ABC123" }
      );
    });

    it("returns false for empty/blank reference", async () => {
      const result = await service.checkMpesaReferenceExists("   ", 1);

      expect(result).toBe(false);
      expect(mockPaymentRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});

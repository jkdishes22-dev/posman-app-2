import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupplierService } from "@backend/service/SupplierService";
import { SupplierStatus } from "@backend/entities/Supplier";
import { SupplierTransactionType, SupplierReferenceType } from "@backend/entities/SupplierTransaction";
import { cache } from "@backend/utils/cache";
import {
  createMockDataSource,
  createMockRepository,
} from "../mocks/createMockDataSource";

describe("SupplierService", () => {
  let mockSupplierRepo: ReturnType<typeof createMockRepository>;
  let mockTransactionRepo: ReturnType<typeof createMockRepository>;
  let service: SupplierService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupplierRepo = createMockRepository();
    mockTransactionRepo = createMockRepository();
    const mockDs = createMockDataSource({
      Supplier: mockSupplierRepo,
      SupplierTransaction: mockTransactionRepo,
    });
    service = new SupplierService(mockDs as any);
  });

  describe("createSupplier", () => {
    it("creates supplier with ACTIVE status and saves", async () => {
      const data = { name: "Acme Foods" };
      const saved = { id: 1, name: "Acme Foods", status: SupplierStatus.ACTIVE };
      mockSupplierRepo.create.mockReturnValue(saved);
      mockSupplierRepo.save.mockResolvedValue(saved);

      const result = await service.createSupplier(data, 1);

      expect(mockSupplierRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: SupplierStatus.ACTIVE })
      );
      expect(result).toEqual(saved);
    });

    it("invalidates suppliers cache after creation", async () => {
      const invalidateSpy = vi.spyOn(cache, "invalidate");
      mockSupplierRepo.save.mockResolvedValue({ id: 1 });

      await service.createSupplier({ name: "Test" }, 1);

      expect(invalidateSpy).toHaveBeenCalledWith("suppliers");
    });
  });

  describe("deleteSupplier", () => {
    it("soft-deletes by setting status to INACTIVE", async () => {
      await service.deleteSupplier(3, 1);

      expect(mockSupplierRepo.update).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ status: SupplierStatus.INACTIVE })
      );
    });

    it("does not call repo.delete (hard delete)", async () => {
      await service.deleteSupplier(3, 1);

      expect(mockSupplierRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe("fetchSuppliers", () => {
    it("returns cached result on second call", async () => {
      const qb = mockSupplierRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue([]);

      await service.fetchSuppliers();
      await service.fetchSuppliers();

      expect(qb.getMany).toHaveBeenCalledTimes(1);
    });
  });

  describe("getSupplierBalance", () => {
    it("calculates debit balance correctly from raw transaction sums", async () => {
      const qb = mockTransactionRepo.createQueryBuilder();
      qb.getRawOne.mockResolvedValue({ total_debit: "5000", total_credit: "1000" });
      mockSupplierRepo.findOne.mockResolvedValue({ id: 1, credit_limit: 10000 });

      const balance = await service.getSupplierBalance(1);

      expect(balance.debit_balance).toBe(4000); // 5000 - 1000
      expect(balance.available_credit).toBe(6000); // 10000 - 4000
    });

    it("returns zeroed balance when no transactions exist", async () => {
      const qb = mockTransactionRepo.createQueryBuilder();
      qb.getRawOne.mockResolvedValue(null);
      mockSupplierRepo.findOne.mockResolvedValue({ id: 1, credit_limit: 5000 });

      const balance = await service.getSupplierBalance(1);

      expect(balance.debit_balance).toBe(0);
      expect(balance.credit_balance).toBe(0);
      expect(balance.available_credit).toBe(5000);
    });
  });

  describe("createSupplierTransaction", () => {
    it("saves transaction and invalidates supplier balance cache", async () => {
      const invalidateSpy = vi.spyOn(cache, "invalidate");
      mockTransactionRepo.save.mockResolvedValue({ id: 1 });

      await service.createSupplierTransaction(
        1,
        SupplierTransactionType.PURCHASE_ORDER,
        1000,
        0,
        SupplierReferenceType.PURCHASE_ORDER,
        5,
        null,
        1
      );

      expect(mockTransactionRepo.save).toHaveBeenCalled();
      expect(invalidateSpy).toHaveBeenCalledWith("supplier_balance_1");
    });
  });

  describe("recordSupplierCreditTransaction", () => {
    it("throws when amount exceeds outstanding debit balance", async () => {
      // getSupplierBalance mock
      const qb = mockTransactionRepo.createQueryBuilder();
      qb.getRawOne.mockResolvedValue({ total_debit: "1000", total_credit: "0" });
      mockSupplierRepo.findOne.mockResolvedValue({ id: 1, credit_limit: 5000 });

      await expect(
        service.recordSupplierCreditTransaction(1, "payment", 9999, 1)
      ).rejects.toThrow("Amount exceeds outstanding debit balance");
    });

    it("throws when no outstanding debit balance exists", async () => {
      const qb = mockTransactionRepo.createQueryBuilder();
      qb.getRawOne.mockResolvedValue({ total_debit: "0", total_credit: "0" });
      mockSupplierRepo.findOne.mockResolvedValue({ id: 1, credit_limit: 5000 });

      await expect(
        service.recordSupplierCreditTransaction(1, "payment", 100, 1)
      ).rejects.toThrow("No outstanding debit balance");
    });
  });

  describe("listSupplierTransactionsPaginated", () => {
    it("returns total count and paginated rows", async () => {
      const qb: any = mockTransactionRepo.createQueryBuilder();
      qb.clone = vi.fn().mockImplementation(() => qb);
      qb.getCount.mockResolvedValue(42);
      qb.getMany.mockResolvedValue([{ id: 2 }]);

      const result = await service.listSupplierTransactionsPaginated({
        page: 2,
        pageSize: 10,
      });

      expect(result.total).toBe(42);
      expect(result.items).toEqual([{ id: 2 }]);
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
    });
  });
});

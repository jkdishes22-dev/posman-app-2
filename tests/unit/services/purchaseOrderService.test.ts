import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDataSource, createMockRepository, createMockTransactionalEntityManager } from "../mocks/createMockDataSource";

const mockGetSupplierBalance = vi.fn();
const mockCreateSupplierTransaction = vi.fn().mockResolvedValue({});
const mockAddStock = vi.fn().mockResolvedValue({});

vi.mock("@backend/service/InventoryService", () => ({
  InventoryService: vi.fn().mockImplementation(() => ({
    addStock: mockAddStock,
    addInventoryFromPurchaseOrder: mockAddStock,
  })),
}));

vi.mock("@backend/service/SupplierService", () => ({
  SupplierService: vi.fn().mockImplementation(() => ({
    getSupplierBalance: mockGetSupplierBalance,
    createSupplierTransaction: mockCreateSupplierTransaction,
  })),
}));

import { PurchaseOrderService } from "@backend/service/PurchaseOrderService";
import { PurchaseOrderStatus } from "@backend/entities/PurchaseOrder";

describe("PurchaseOrderService", () => {
  let mockPORepo: ReturnType<typeof createMockRepository>;
  let mockPOItemRepo: ReturnType<typeof createMockRepository>;
  let mockSupplierRepo: ReturnType<typeof createMockRepository>;
  let service: PurchaseOrderService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPORepo = createMockRepository();
    mockPOItemRepo = createMockRepository();
    mockSupplierRepo = createMockRepository();
    const mockDs = createMockDataSource({
      PurchaseOrder: mockPORepo,
      PurchaseOrderItem: mockPOItemRepo,
      Supplier: mockSupplierRepo,
    });
    service = new PurchaseOrderService(mockDs as any);
  });

  describe("createPurchaseOrder", () => {
    it("throws when supplier does not exist", async () => {
      mockSupplierRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createPurchaseOrder({ supplier_id: 99, items: [] }, 1)
      ).rejects.toThrow("Supplier 99 not found");
    });

    it("throws when PO total exceeds supplier available credit", async () => {
      mockSupplierRepo.findOne.mockResolvedValue({ id: 1, credit_limit: 1000 });
      mockGetSupplierBalance.mockResolvedValue({ available_credit: 500 });

      await expect(
        service.createPurchaseOrder({
          supplier_id: 1,
          items: [{ item_id: 1, quantity_ordered: 10, unit_price: 100 }],
        }, 1)
      ).rejects.toThrow("exceeds available credit");
    });

    it("allows PO creation when supplier has no credit limit (credit_limit = 0)", async () => {
      mockSupplierRepo.findOne.mockResolvedValue({ id: 1, credit_limit: 0 });
      mockGetSupplierBalance.mockResolvedValue({ available_credit: 0 });

      const qb = mockPORepo.createQueryBuilder();
      qb.getOne.mockResolvedValue(null); // no existing PO for today

      const txn = createMockTransactionalEntityManager();
      const savedPO = { id: 5, order_number: "PO-20260420-001" };
      txn.save.mockResolvedValue(savedPO);
      txn.create.mockImplementation((_cls: any, data: any) => data);
      txn.findOne.mockResolvedValue({ id: 5, items: [] });
      mockPORepo.manager.transaction.mockImplementationOnce(async (cb: any) => cb(txn));

      const result = await service.createPurchaseOrder({
        supplier_id: 1,
        items: [{ item_id: 1, quantity_ordered: 5, unit_price: 100 }],
      }, 1);

      expect(txn.save).toHaveBeenCalled();
    });
  });

  describe("generatePONumber (via createPurchaseOrder)", () => {
    it("generates PO-YYYYMMDD-001 when no PO exists for today", async () => {
      mockSupplierRepo.findOne.mockResolvedValue({ id: 1, credit_limit: 0 });
      mockGetSupplierBalance.mockResolvedValue({ available_credit: 0 });

      const qb = mockPORepo.createQueryBuilder();
      qb.getOne.mockResolvedValue(null);

      const txn = createMockTransactionalEntityManager();
      txn.create.mockImplementation((_cls: any, data: any) => data);
      txn.save.mockResolvedValue({ id: 1, order_number: "PO-20260420-001" });
      txn.findOne.mockResolvedValue({ id: 1, items: [] });
      mockPORepo.manager.transaction.mockImplementationOnce(async (cb: any) => cb(txn));

      await service.createPurchaseOrder({ supplier_id: 1, items: [] }, 1);

      const createCall = txn.create.mock.calls[0];
      expect(createCall[1].order_number).toMatch(/^PO-\d{8}-001$/);
    });

    it("increments sequence when a PO already exists for today", async () => {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      mockSupplierRepo.findOne.mockResolvedValue({ id: 1, credit_limit: 0 });
      mockGetSupplierBalance.mockResolvedValue({ available_credit: 0 });

      const qb = mockPORepo.createQueryBuilder();
      qb.getOne.mockResolvedValue({ order_number: `PO-${today}-003` });

      const txn = createMockTransactionalEntityManager();
      txn.create.mockImplementation((_cls: any, data: any) => data);
      txn.save.mockResolvedValue({ id: 2, order_number: `PO-${today}-004` });
      txn.findOne.mockResolvedValue({ id: 2, items: [] });
      mockPORepo.manager.transaction.mockImplementationOnce(async (cb: any) => cb(txn));

      await service.createPurchaseOrder({ supplier_id: 1, items: [] }, 1);

      const createCall = txn.create.mock.calls[0];
      expect(createCall[1].order_number).toBe(`PO-${today}-004`);
    });
  });

  describe("updatePurchaseOrder", () => {
    it("throws when PO not found", async () => {
      mockPORepo.findOne.mockResolvedValue(null);

      await expect(service.updatePurchaseOrder(99, {}, 1)).rejects.toThrow(
        "Purchase order 99 not found"
      );
    });

    it("throws when PO is not in DRAFT status", async () => {
      mockPORepo.findOne.mockResolvedValue({ id: 1, status: PurchaseOrderStatus.RECEIVED });

      await expect(service.updatePurchaseOrder(1, {}, 1)).rejects.toThrow(
        "Cannot update purchase order"
      );
    });
  });
});

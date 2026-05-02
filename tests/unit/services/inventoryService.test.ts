import { describe, it, expect, vi, beforeEach } from "vitest";
import { InventoryService } from "@backend/service/InventoryService";
import { cache } from "@backend/utils/cache";
import {
  createMockDataSource,
  createMockRepository,
  createMockTransactionalEntityManager,
} from "../mocks/createMockDataSource";
import { BillStatus } from "@backend/entities/Bill";

describe("InventoryService", () => {
  let mockInventoryRepo: ReturnType<typeof createMockRepository>;
  let mockTransactionRepo: ReturnType<typeof createMockRepository>;
  let mockBillRepo: ReturnType<typeof createMockRepository>;
  let mockItemGroupRepo: ReturnType<typeof createMockRepository>;
  let service: InventoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockInventoryRepo = createMockRepository();
    mockTransactionRepo = createMockRepository();
    mockBillRepo = createMockRepository();
    mockItemGroupRepo = createMockRepository();
    const mockDs = createMockDataSource({
      Inventory: mockInventoryRepo,
      InventoryTransaction: mockTransactionRepo,
      Bill: mockBillRepo,
      ItemGroup: mockItemGroupRepo,
    });
    service = new InventoryService(mockDs as any);
  });

  describe("initializeInventory", () => {
    it("throws when inventory already exists for item", async () => {
      mockInventoryRepo.findOne.mockResolvedValue({ item_id: 1 });

      await expect(
        service.initializeInventory(1, 0, null, null, null, 1)
      ).rejects.toThrow("Inventory already exists for item 1");
    });

    it("creates and saves new inventory with given initial quantity", async () => {
      mockInventoryRepo.findOne.mockResolvedValue(null);
      const created = { item_id: 1, quantity: 10 };
      mockInventoryRepo.create.mockReturnValue(created);
      mockInventoryRepo.save.mockResolvedValue({ id: 1, ...created });

      const result = await service.initializeInventory(1, 10, 5, 100, 20, 1);

      expect(mockInventoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ item_id: 1, quantity: 10 })
      );
      expect(result).toMatchObject({ item_id: 1, quantity: 10 });
    });
  });

  describe("getInventoryLevel", () => {
    it("returns null when no inventory record exists for item", async () => {
      mockInventoryRepo.findOne.mockResolvedValue(null);

      const result = await service.getInventoryLevel(99);

      expect(result).toBeNull();
    });

    it("sets available_quantity to on-hand quantity (no reservation column)", async () => {
      mockInventoryRepo.findOne.mockResolvedValue({
        item_id: 1,
        quantity: 20,
        min_stock_level: null,
        max_stock_level: null,
        reorder_point: 10,
      });

      const result = await service.getInventoryLevel(1);

      expect(result?.available_quantity).toBe(20);
    });

    it("marks is_low_stock true when available_quantity <= reorder_point", async () => {
      mockInventoryRepo.findOne.mockResolvedValue({
        item_id: 1,
        quantity: 4,
        min_stock_level: null,
        max_stock_level: null,
        reorder_point: 5,
      });

      const result = await service.getInventoryLevel(1);

      expect(result?.is_low_stock).toBe(true);
    });

    it("returns cached result on second call", async () => {
      mockInventoryRepo.findOne.mockResolvedValue({
        item_id: 1,
        quantity: 10,
        min_stock_level: null,
        max_stock_level: null,
        reorder_point: null,
      });

      await service.getInventoryLevel(1);
      await service.getInventoryLevel(1);

      expect(mockInventoryRepo.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe("getAvailableStock", () => {
    it("returns 0 when no inventory record exists", async () => {
      mockInventoryRepo.findOne.mockResolvedValue(null);

      const result = await service.getAvailableStock(99);

      expect(result).toBe(0);
    });

    it("returns on-hand quantity as available stock", async () => {
      mockInventoryRepo.findOne.mockResolvedValue({
        item_id: 1,
        quantity: 30,
      });

      const result = await service.getAvailableStock(1);

      expect(result).toBe(30);
    });

    it("returns quantity even when small (no reserved subtraction)", async () => {
      mockInventoryRepo.findOne.mockResolvedValue({
        item_id: 1,
        quantity: 2,
      });

      const result = await service.getAvailableStock(1);

      expect(result).toBe(2);
    });
  });

  describe("addInventoryFromProduction", () => {
    it("creates new inventory record when none exists and adds quantity", async () => {
      mockInventoryRepo.findOne.mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, item_id: 1, quantity: 5, reserved_quantity: 0 });

      await service.addInventoryFromProduction(1, 5, 10, 1);

      expect(mockInventoryRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({ item_id: 1, quantity: 5 })
      );
    });

    it("increments quantity on existing inventory record", async () => {
      const existing = { item_id: 1, quantity: 10, reserved_quantity: 2 };
      mockInventoryRepo.findOne.mockResolvedValue(existing);

      await service.addInventoryFromProduction(1, 5, 10, 1);

      expect(existing.quantity).toBe(15);
      expect(mockInventoryRepo.update).toHaveBeenCalledWith(
        { item_id: 1 },
        expect.objectContaining({ quantity: 15 })
      );
    });

    it("creates a PRODUCTION inventory transaction record", async () => {
      const existing = { item_id: 1, quantity: 10, reserved_quantity: 0 };
      mockInventoryRepo.findOne.mockResolvedValue(existing);

      await service.addInventoryFromProduction(1, 5, 10, 1);

      expect(mockTransactionRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({ item_id: 1, quantity: 5, reference_id: 10 })
      );
    });
  });

  describe("getAvailableInventoryForItems", () => {
    it("returns empty map when no itemIds provided", async () => {
      const result = await service.getAvailableInventoryForItems([]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it("returns 0 for all items when none are found in database", async () => {
      const qb = mockInventoryRepo.manager.getRepository().createQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      mockInventoryRepo.manager.getRepository.mockReturnValue({
        createQueryBuilder: vi.fn().mockReturnValue(qb),
      });

      const result = await service.getAvailableInventoryForItems([1, 2, 3]);

      expect(result.get(1)).toBe(0);
      expect(result.get(2)).toBe(0);
      expect(result.get(3)).toBe(0);
    });
  });

  describe("deductInventoryForSale", () => {
    it("deducts item quantity from inventory on bill submission", async () => {
      mockBillRepo.findOne.mockResolvedValue({
        id: 1,
        status: BillStatus.SUBMITTED,
        bill_items: [{ item: { id: 10, name: "Coffee", allowNegativeInventory: false }, quantity: 3 }],
      });
      mockItemGroupRepo.count.mockResolvedValue(0);

      const txn = createMockTransactionalEntityManager();
      txn.findOne.mockResolvedValue({ item_id: 10, quantity: 10, updated_by: null });
      txn.save.mockImplementation(async (_cls: any, data?: any) => data ?? _cls ?? {});
      txn.create.mockImplementation((_cls: any, data?: any) => data ?? {});
      mockInventoryRepo.manager.transaction.mockImplementationOnce(async (cb: any) => cb(txn));

      await service.deductInventoryForSale(1, 99);

      expect(txn.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ quantity: 7 })
      );
    });

    it("throws when deduction would make quantity negative and allowNegativeInventory is false", async () => {
      mockBillRepo.findOne.mockResolvedValue({
        id: 2,
        status: BillStatus.SUBMITTED,
        bill_items: [{ item: { id: 11, name: "Steak", allowNegativeInventory: false }, quantity: 5 }],
      });
      mockItemGroupRepo.count.mockResolvedValue(0);

      const txn = createMockTransactionalEntityManager();
      txn.findOne.mockResolvedValue({ item_id: 11, quantity: 2, updated_by: null });
      txn.save.mockResolvedValue({});
      txn.create.mockImplementation((_cls: any, data?: any) => data ?? {});
      mockInventoryRepo.manager.transaction.mockImplementationOnce(async (cb: any) => cb(txn));

      await expect(service.deductInventoryForSale(2, 99)).rejects.toThrow(
        "Inventory quantity would go negative"
      );
    });

    it("allows inventory to go negative when allowNegativeInventory is true", async () => {
      mockBillRepo.findOne.mockResolvedValue({
        id: 3,
        status: BillStatus.SUBMITTED,
        bill_items: [{ item: { id: 12, name: "Tap Water", allowNegativeInventory: true }, quantity: 10 }],
      });
      mockItemGroupRepo.count.mockResolvedValue(0);

      const txn = createMockTransactionalEntityManager();
      txn.findOne.mockResolvedValue({ item_id: 12, quantity: 0, updated_by: null });
      txn.save.mockImplementation(async (_cls: any, data?: any) => data ?? _cls ?? {});
      txn.create.mockImplementation((_cls: any, data?: any) => data ?? {});
      mockInventoryRepo.manager.transaction.mockImplementationOnce(async (cb: any) => cb(txn));

      await expect(service.deductInventoryForSale(3, 99)).resolves.toBeUndefined();

      expect(txn.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ quantity: -10 })
      );
    });
  });
});

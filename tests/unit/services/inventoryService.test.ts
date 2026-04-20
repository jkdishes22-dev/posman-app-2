import { describe, it, expect, vi, beforeEach } from "vitest";
import { InventoryService } from "@backend/service/InventoryService";
import { cache } from "@backend/utils/cache";
import {
  createMockDataSource,
  createMockRepository,
} from "../mocks/createMockDataSource";

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

    it("computes available_quantity as quantity - reserved_quantity", async () => {
      mockInventoryRepo.findOne.mockResolvedValue({
        item_id: 1,
        quantity: 20,
        reserved_quantity: 5,
        min_stock_level: null,
        max_stock_level: null,
        reorder_point: 10,
      });

      const result = await service.getInventoryLevel(1);

      expect(result?.available_quantity).toBe(15);
    });

    it("marks is_low_stock true when available_quantity <= reorder_point", async () => {
      mockInventoryRepo.findOne.mockResolvedValue({
        item_id: 1,
        quantity: 10,
        reserved_quantity: 5,
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
        reserved_quantity: 0,
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

    it("returns quantity minus reserved_quantity", async () => {
      mockInventoryRepo.findOne.mockResolvedValue({
        item_id: 1,
        quantity: 30,
        reserved_quantity: 8,
      });

      const result = await service.getAvailableStock(1);

      expect(result).toBe(22);
    });

    it("returns 0 when quantity is less than reserved (never negative)", async () => {
      mockInventoryRepo.findOne.mockResolvedValue({
        item_id: 1,
        quantity: 2,
        reserved_quantity: 5,
      });

      const result = await service.getAvailableStock(1);

      expect(result).toBe(0);
    });
  });

  describe("addInventoryFromProduction", () => {
    it("creates new inventory record when none exists and adds quantity", async () => {
      mockInventoryRepo.findOne.mockResolvedValue(null);
      const newInventory = { item_id: 1, quantity: 0, reserved_quantity: 0 };
      mockInventoryRepo.create.mockReturnValue(newInventory);
      mockInventoryRepo.save.mockResolvedValue({ ...newInventory, quantity: 5 });

      await service.addInventoryFromProduction(1, 5, 10, 1);

      expect(mockInventoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 5 })
      );
    });

    it("increments quantity on existing inventory record", async () => {
      const existing = { item_id: 1, quantity: 10, reserved_quantity: 2 };
      mockInventoryRepo.findOne.mockResolvedValue(existing);
      mockInventoryRepo.save.mockResolvedValue({ ...existing, quantity: 15 });

      await service.addInventoryFromProduction(1, 5, 10, 1);

      expect(existing.quantity).toBe(15);
      expect(mockInventoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 15 })
      );
    });

    it("creates a PRODUCTION inventory transaction record", async () => {
      const existing = { item_id: 1, quantity: 10, reserved_quantity: 0 };
      mockInventoryRepo.findOne.mockResolvedValue(existing);
      mockInventoryRepo.save.mockResolvedValue(existing);
      mockTransactionRepo.save.mockResolvedValue({});

      await service.addInventoryFromProduction(1, 5, 10, 1);

      expect(mockTransactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ item_id: 1, quantity: 5, reference_id: 10 })
      );
      expect(mockTransactionRepo.save).toHaveBeenCalled();
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
});

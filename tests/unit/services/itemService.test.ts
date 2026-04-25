import { describe, it, expect, vi, beforeEach } from "vitest";
import { ItemService } from "@backend/service/ItemService";
import { cache } from "@backend/utils/cache";
import {
  createMockDataSource,
  createMockRepository,
  createMockQueryBuilder,
} from "../mocks/createMockDataSource";

vi.mock("@backend/utils/logger", () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("ItemService", () => {
  let mockItemRepo: ReturnType<typeof createMockRepository>;
  let mockPricelistItemRepo: ReturnType<typeof createMockRepository>;
  let mockItemGroupRepo: ReturnType<typeof createMockRepository>;
  let service: ItemService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockItemRepo = createMockRepository();
    mockPricelistItemRepo = createMockRepository();
    mockItemGroupRepo = createMockRepository();
    const mockDs = createMockDataSource({
      Item: mockItemRepo,
      PricelistItem: mockPricelistItemRepo,
      ItemGroup: mockItemGroupRepo,
    });
    service = new ItemService(mockDs as any);
  });

  describe("fetchItems", () => {
    it("returns mapped items from getRawMany including pricelistItemId", async () => {
      const rawRow = {
        item_id: 1,
        item_name: "Burger",
        item_code: "BRG",
        item_isGroup: 0,
        item_isStock: 0,
        item_status: "active",
        category_id: 2,
        category_name: "Mains",
        price: 800,
        pricelist_item_isEnabled: 1,
        pricelistItemId: 10,
        pricelistId: 3,
        pricelistName: "Standard",
        stationName: "Bar",
      };
      const qb = createMockQueryBuilder();
      qb.getRawMany.mockResolvedValue([rawRow]);
      mockItemRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.fetchItems(2, 1, false);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        name: "Burger",
        price: 800,
        pricelistItemId: 10,
        pricelistId: 3,
      });
    });

    it("caches result on second call", async () => {
      const qb = createMockQueryBuilder();
      qb.getRawMany.mockResolvedValue([]);
      mockItemRepo.createQueryBuilder.mockReturnValue(qb);

      await service.fetchItems(1, 1, false);
      await service.fetchItems(1, 1, false);

      expect(qb.getRawMany).toHaveBeenCalledTimes(1);
    });
  });

  describe("createItem", () => {
    it("runs inside a transaction and invalidates items cache", async () => {
      const invalidateSpy = vi.spyOn(cache, "invalidate");
      const mockTxnManager = {
        save: vi.fn().mockResolvedValue({ id: 1, name: "Steak" }),
        findOne: vi.fn().mockResolvedValue(null),
      };
      mockItemRepo.manager.connection.transaction.mockImplementationOnce(
        async (cb: any) => cb(mockTxnManager)
      );

      await service.createItem(
        { name: "Steak" },
        { pricelistId: 2, price: 1500 },
        1
      );

      expect(mockItemRepo.manager.connection.transaction).toHaveBeenCalled();
      expect(invalidateSpy).toHaveBeenCalledWith("items");
    });
  });

  describe("updateItem", () => {
    function makeTransactionalEntityManager(overrides: any = {}) {
      const qb = createMockQueryBuilder();
      return {
        save: vi.fn().mockImplementation(async (_entity: any, data?: any) => data ?? {}),
        findOne: vi.fn().mockResolvedValue({ id: 1, name: "Burger", category: { id: "1" } }),
        getRepository: vi.fn().mockReturnValue({ findOne: vi.fn().mockResolvedValue(null) }),
        createQueryBuilder: vi.fn().mockReturnValue(qb),
        ...overrides,
      };
    }

    it("updates price on existing pricelist item when pricelistItemId is provided", async () => {
      const existingPricelistItem = {
        id: 10,
        price: 500,
        item: { id: 1 },
        pricelist: { id: 3 },
        updated_by: null,
      };
      const txnQb = createMockQueryBuilder();
      txnQb.getOne.mockResolvedValue(existingPricelistItem);
      const txnManager = makeTransactionalEntityManager({
        createQueryBuilder: vi.fn().mockReturnValue(txnQb),
      });

      mockItemRepo.manager.connection.transaction.mockImplementationOnce(
        async (cb: any) => cb(txnManager)
      );
      mockItemRepo.findOne.mockResolvedValue({ id: 1, name: "Burger" });
      mockPricelistItemRepo.createQueryBuilder.mockReturnValue(txnQb);

      await service.updateItem(
        { id: 1, name: "Burger", code: "BRG" },
        { pricelistItemId: 10, price: 800 },
        1,
        3
      );

      expect(txnManager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ price: 800 })
      );
    });

    it("disables existing pricelist items and creates new one when pricelistItemId is absent", async () => {
      const txnQb = createMockQueryBuilder();
      txnQb.getOne.mockResolvedValue(null);
      const txnManager = makeTransactionalEntityManager({
        createQueryBuilder: vi.fn().mockReturnValue(txnQb),
      });

      mockItemRepo.manager.connection.transaction.mockImplementationOnce(
        async (cb: any) => cb(txnManager)
      );
      mockItemRepo.findOne.mockResolvedValue({ id: 1, name: "Burger" });
      mockPricelistItemRepo.createQueryBuilder.mockReturnValue(txnQb);
      mockPricelistItemRepo.create.mockReturnValue({ price: 900 });

      await service.updateItem(
        { id: 1, name: "Burger", code: "BRG" },
        { pricelistItemId: undefined, price: 900 },
        1,
        3
      );

      // The UPDATE ... SET is_enabled=false query must have been executed
      expect(txnQb.update).toHaveBeenCalled();
      expect(txnQb.execute).toHaveBeenCalled();
    });
  });

  describe("searchItemsByName", () => {
    it("applies LIKE filter with the search query", async () => {
      const qb = createMockQueryBuilder();
      qb.getRawMany.mockResolvedValue([]);
      mockItemRepo.createQueryBuilder.mockReturnValue(qb);

      await service.searchItemsByName("Burger");

      expect(qb.where).toHaveBeenCalledWith(
        "item.name LIKE :query",
        { query: "%Burger%" }
      );
    });
  });
});

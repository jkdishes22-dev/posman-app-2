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
    it("returns mapped items from getRawMany", async () => {
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
        pricelistId: 3,
        pricelistName: "Standard",
        stationName: "Bar",
      };
      const qb = createMockQueryBuilder();
      qb.getRawMany.mockResolvedValue([rawRow]);
      mockItemRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.fetchItems(2, 1, false);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 1, name: "Burger", price: 800 });
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

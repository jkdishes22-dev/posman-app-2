import { describe, it, expect, beforeEach, vi } from "vitest";
import { ItemService } from "@backend/service/ItemService";
import { cache } from "@backend/utils/cache";

const mockRawRows = [
  {
    item_id: 1, item_name: "Boiled Egg", item_code: "EGG001",
    item_isGroup: 0, item_isStock: 0,
    category_id: null, category_name: null,
    pi_id: null, pi_price: null, pl_id: null, pl_name: null,
  },
  {
    item_id: 2, item_name: "Chapati", item_code: "CHP001",
    item_isGroup: 0, item_isStock: 0,
    category_id: 10, category_name: "Breads",
    pi_id: 100, pi_price: 50, pl_id: 5, pl_name: "Main Pricelist",
  },
  {
    item_id: 2, item_name: "Chapati", item_code: "CHP001",
    item_isGroup: 0, item_isStock: 0,
    category_id: 10, category_name: "Breads",
    pi_id: 101, pi_price: 45, pl_id: 6, pl_name: "Happy Hour",
  },
];

const mockQb = {
  leftJoin: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  getRawMany: vi.fn().mockResolvedValue(mockRawRows),
};

const mockItemRepo = {
  findOne: vi.fn(),
  update: vi.fn().mockResolvedValue({ affected: 1 }),
  createQueryBuilder: vi.fn(() => mockQb),
};

const mockDataSource = {
  getRepository: vi.fn(() => mockItemRepo),
};

beforeEach(() => {
  vi.clearAllMocks();
  cache.clear();
});

describe("ItemService.fetchAllItemsWithDetailsRaw", () => {
  it("returns all active items grouped by id with their pricelist info", async () => {
    const service = new ItemService(mockDataSource as any);
    const result = await service.fetchAllItemsWithDetailsRaw();

    expect(result).toHaveLength(2);

    const egg = result.find((i) => i.id === 1);
    expect(egg).toBeDefined();
    expect(egg!.category).toBeNull();
    expect(egg!.pricelists).toHaveLength(0);

    const chapati = result.find((i) => i.id === 2);
    expect(chapati).toBeDefined();
    expect(chapati!.category).toEqual({ id: 10, name: "Breads" });
    expect(chapati!.pricelists).toHaveLength(2);
    expect(chapati!.pricelists.map((p: any) => p.name)).toContain("Main Pricelist");
    expect(chapati!.pricelists.map((p: any) => p.name)).toContain("Happy Hour");
  });

  it("returns cached result on second call", async () => {
    const service = new ItemService(mockDataSource as any);
    await service.fetchAllItemsWithDetailsRaw();
    await service.fetchAllItemsWithDetailsRaw();

    expect(mockQb.getRawMany).toHaveBeenCalledTimes(1);
  });
});

describe("ItemService.updateItemCategory", () => {
  it("throws 404 when item does not exist", async () => {
    mockItemRepo.findOne.mockResolvedValue(null);
    const service = new ItemService(mockDataSource as any);

    await expect(service.updateItemCategory(999, 1)).rejects.toMatchObject({
      message: "Item not found",
      statusCode: 404,
    });
  });

  it("updates item category to specified value", async () => {
    mockItemRepo.findOne.mockResolvedValue({ id: 1, name: "Egg" });
    const service = new ItemService(mockDataSource as any);
    await service.updateItemCategory(1, 10);

    expect(mockItemRepo.update).toHaveBeenCalledWith(1, { category: { id: 10 } });
  });

  it("sets category to null when categoryId is null", async () => {
    mockItemRepo.findOne.mockResolvedValue({ id: 1, name: "Egg" });
    const service = new ItemService(mockDataSource as any);
    await service.updateItemCategory(1, null);

    expect(mockItemRepo.update).toHaveBeenCalledWith(1, { category: null });
  });

  it("invalidates item caches after update", async () => {
    cache.set("items_all_with_details", []);
    cache.set("items_10_1_false", []);

    mockItemRepo.findOne.mockResolvedValue({ id: 1, name: "Egg" });
    const service = new ItemService(mockDataSource as any);
    await service.updateItemCategory(1, 10);

    expect(cache.get("items_all_with_details")).toBeNull();
    expect(cache.get("items_10_1_false")).toBeNull();
  });
});

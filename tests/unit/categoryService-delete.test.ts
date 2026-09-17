import { describe, it, expect, beforeEach, vi } from "vitest";
import { CategoryService } from "@backend/service/CategoryService";
import { CategoryStatus } from "@backend/entities/Category";
import { cache } from "@backend/utils/cache";

const mockItemQb = {
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue({ affected: 2 }),
};

const mockCategoryRepo = {
  create: vi.fn(),
  save: vi.fn(),
  find: vi.fn(),
  findOne: vi.fn(),
  update: vi.fn().mockResolvedValue({ affected: 1 }),
  createQueryBuilder: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  getMany: vi.fn().mockResolvedValue([]),
};

const mockItemRepo = {
  createQueryBuilder: vi.fn(() => mockItemQb),
};

const mockDataSource = {
  getRepository: vi.fn((entity) => {
    if (entity.name === "Category" || entity === "Category") return mockCategoryRepo;
    return mockItemRepo;
  }),
};

beforeEach(() => {
  vi.clearAllMocks();
  cache.clear();
});

describe("CategoryService.deleteCategory", () => {
  it("nullifies item_category_id for items in the deleted category", async () => {
    const service = new CategoryService(mockDataSource as any);
    await service.deleteCategory(5);

    expect(mockItemRepo.createQueryBuilder).toHaveBeenCalled();
    expect(mockItemQb.update).toHaveBeenCalled();
    expect(mockItemQb.set).toHaveBeenCalledWith({ category: null });
    expect(mockItemQb.where).toHaveBeenCalledWith("item_category_id = :id", { id: 5 });
    expect(mockItemQb.execute).toHaveBeenCalled();
  });

  it("soft-deletes the category after nullifying items", async () => {
    const service = new CategoryService(mockDataSource as any);
    await service.deleteCategory(5);

    expect(mockCategoryRepo.update).toHaveBeenCalledWith(5, { status: CategoryStatus.DELETED });
  });

  it("invalidates category and items caches", async () => {
    cache.set("categories_active", []);
    cache.set("items_all_with_details", []);
    cache.set("items_pricelist_1", []);

    const service = new CategoryService(mockDataSource as any);
    await service.deleteCategory(5);

    expect(cache.get("categories_active")).toBeNull();
    expect(cache.get("items_all_with_details")).toBeNull();
    expect(cache.get("items_pricelist_1")).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CategoryService } from "@backend/service/CategoryService";
import { CategoryStatus } from "@backend/entities/Category";
import { cache } from "@backend/utils/cache";
import {
  createMockDataSource,
  createMockRepository,
} from "../mocks/createMockDataSource";

vi.mock("@backend/utils/logger", () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("CategoryService", () => {
  let mockCategoryRepo: ReturnType<typeof createMockRepository>;
  let service: CategoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCategoryRepo = createMockRepository();
    const mockDs = createMockDataSource({ Category: mockCategoryRepo });
    service = new CategoryService(mockDs as any);
  });

  describe("createCategory", () => {
    it("creates category with ACTIVE status", async () => {
      const expected = { id: 1, name: "Beverages", status: CategoryStatus.ACTIVE };
      mockCategoryRepo.create.mockReturnValue(expected);
      mockCategoryRepo.save.mockResolvedValue(expected);

      const result = await service.createCategory("Beverages");

      expect(mockCategoryRepo.create).toHaveBeenCalledWith({
        name: "Beverages",
        status: CategoryStatus.ACTIVE,
      });
      expect(result).toEqual(expected);
    });

    it("invalidates categories cache after creation", async () => {
      const invalidateSpy = vi.spyOn(cache, "invalidate");
      mockCategoryRepo.save.mockResolvedValue({ id: 1, name: "Food" });

      await service.createCategory("Food");

      expect(invalidateSpy).toHaveBeenCalledWith("categories");
    });
  });

  describe("fetchCategories", () => {
    it("returns data from repository on first call", async () => {
      const fakeCategories = [{ id: 1, name: "Food" }];
      const qb = mockCategoryRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue(fakeCategories);

      const result = await service.fetchCategories();

      expect(result).toEqual(fakeCategories);
    });

    it("returns cached data on second call without hitting repository", async () => {
      const fakeCategories = [{ id: 1, name: "Food" }];
      const qb = mockCategoryRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue(fakeCategories);

      await service.fetchCategories();
      await service.fetchCategories();

      expect(qb.getMany).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteCategory", () => {
    it("soft-deletes by updating status to DELETED (does not call repo.delete)", async () => {
      await service.deleteCategory(5);

      expect(mockCategoryRepo.update).toHaveBeenCalledWith(5, {
        status: CategoryStatus.DELETED,
      });
      expect(mockCategoryRepo.delete).not.toHaveBeenCalled();
    });

    it("invalidates categories cache after deletion", async () => {
      const invalidateSpy = vi.spyOn(cache, "invalidate");

      await service.deleteCategory(5);

      expect(invalidateSpy).toHaveBeenCalledWith("categories");
    });
  });
});

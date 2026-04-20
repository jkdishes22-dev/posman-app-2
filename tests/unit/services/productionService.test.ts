import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProductionService } from "@backend/service/ProductionService";
import { ItemStatus } from "@backend/entities/Item";
import { cache } from "@backend/utils/cache";
import {
  createMockDataSource,
  createMockRepository,
} from "../mocks/createMockDataSource";

describe("ProductionService", () => {
  let mockItemRepo: ReturnType<typeof createMockRepository>;
  let service: ProductionService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockItemRepo = createMockRepository();
    const mockDs = createMockDataSource({ Item: mockItemRepo });
    service = new ProductionService(mockDs as any);
  });

  describe("createProductionItem", () => {
    it("creates item with ACTIVE status and sets created_by", async () => {
      const payload = { name: "Nyama Choma", isStock: false };
      const saved = { id: 1, ...payload, status: ItemStatus.ACTIVE, created_by: 42 };
      mockItemRepo.create.mockReturnValue(saved);
      mockItemRepo.save.mockResolvedValue(saved);

      const result = await service.createProductionItem(payload, 42);

      expect(mockItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ created_by: 42, status: ItemStatus.ACTIVE })
      );
      expect(result).toEqual(saved);
    });

    it("invalidates production and items caches after creation", async () => {
      const invalidateSpy = vi.spyOn(cache, "invalidate");
      mockItemRepo.save.mockResolvedValue({ id: 1 });

      await service.createProductionItem({ name: "Test" }, 1);

      expect(invalidateSpy).toHaveBeenCalledWith("production_items_composite");
      expect(invalidateSpy).toHaveBeenCalledWith("production_items_sellable");
      expect(invalidateSpy).toHaveBeenCalledWith("items");
    });
  });

  describe("fetchProductionItems", () => {
    it("fetches sellable items (isStock: false) when compositeOnly is false", async () => {
      await service.fetchProductionItems(false);

      expect(mockItemRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isStock: false } })
      );
    });

    it("fetches composite items (isGroup: true) when compositeOnly is true", async () => {
      await service.fetchProductionItems(true);

      expect(mockItemRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isGroup: true } })
      );
    });

    it("returns cached result on second call without hitting repository", async () => {
      const items = [{ id: 1, name: "Steak" }];
      mockItemRepo.find.mockResolvedValue(items);

      await service.fetchProductionItems(false);
      await service.fetchProductionItems(false);

      expect(mockItemRepo.find).toHaveBeenCalledTimes(1);
    });
  });
});

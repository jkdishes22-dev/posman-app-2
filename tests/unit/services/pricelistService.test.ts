import { describe, it, expect, vi, beforeEach } from "vitest";
import { PricelistService } from "@backend/service/PricelistService";
import { PriceListStatus } from "@backend/entities/Pricelist";
import { cache } from "@backend/utils/cache";
import {
  createMockDataSource,
  createMockRepository,
} from "../mocks/createMockDataSource";

vi.mock("@backend/utils/logger", () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("PricelistService", () => {
  let mockPricelistRepo: ReturnType<typeof createMockRepository>;
  let mockPricelistItemRepo: ReturnType<typeof createMockRepository>;
  let mockStationRepo: ReturnType<typeof createMockRepository>;
  let mockStationPricelistRepo: ReturnType<typeof createMockRepository>;
  let service: PricelistService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPricelistRepo = createMockRepository();
    mockPricelistItemRepo = createMockRepository();
    mockStationRepo = createMockRepository();
    mockStationPricelistRepo = createMockRepository();
    const mockDs = createMockDataSource({
      Pricelist: mockPricelistRepo,
      PricelistItem: mockPricelistItemRepo,
      Station: mockStationRepo,
      StationPricelist: mockStationPricelistRepo,
    });
    service = new PricelistService(mockDs as any);
  });

  describe("createPricelist", () => {
    it("saves pricelist with the given payload and invalidates cache", async () => {
      const invalidateSpy = vi.spyOn(cache, "invalidate");
      const payload = { name: "Standard Menu" };
      const saved = { id: 1, ...payload };
      mockPricelistRepo.create.mockReturnValue(saved);
      mockPricelistRepo.save.mockResolvedValue(saved);

      const result = await service.createPricelist(payload, 1);

      expect(mockPricelistRepo.save).toHaveBeenCalled();
      expect(invalidateSpy).toHaveBeenCalledWith("pricelists");
      expect(result).toEqual(saved);
    });
  });

  describe("fetchPricelists", () => {
    it("returns pricelists from query builder", async () => {
      const pricelists = [{ id: 1, name: "Standard" }];
      const qb = mockPricelistRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue(pricelists);

      const result = await service.fetchPricelists();

      expect(result).toEqual(pricelists);
    });

    it("caches result on second call", async () => {
      const qb = mockPricelistRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue([]);

      await service.fetchPricelists();
      await service.fetchPricelists();

      expect(qb.getMany).toHaveBeenCalledTimes(1);
    });
  });

  describe("getPricelistById", () => {
    it("loads pricelist with stationPricelists and station via query builder", async () => {
      vi.spyOn(cache, "get").mockReturnValue(null);
      const pricelist = { id: 3, name: "Standard" };
      const qb = mockPricelistRepo.createQueryBuilder();
      qb.getOne.mockResolvedValue(pricelist);

      const result = await service.getPricelistById(3);

      expect(mockPricelistRepo.createQueryBuilder).toHaveBeenCalledWith("pricelist");
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith("pricelist.stationPricelists", "sp");
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith("sp.station", "station");
      expect(qb.where).toHaveBeenCalledWith("pricelist.id = :id", { id: 3 });
      expect(result).toBe(pricelist);
    });
  });

  describe("updatePricelistStatus", () => {
    it("updates pricelist status field", async () => {
      mockPricelistRepo.update.mockResolvedValue({ affected: 1 });

      await service.updatePricelistStatus(1, PriceListStatus.ACTIVE);

      expect(mockPricelistRepo.update).toHaveBeenCalledWith(
        { id: 1 },
        { status: PriceListStatus.ACTIVE }
      );
    });

    it("throws when pricelist not found (affected = 0)", async () => {
      mockPricelistRepo.update.mockResolvedValue({ affected: 0 });

      await expect(service.updatePricelistStatus(999, PriceListStatus.ACTIVE)).rejects.toThrow(
        "Pricelist not found"
      );
    });

    it("invalidates all pricelist-related caches", async () => {
      const invalidateSpy = vi.spyOn(cache, "invalidate");
      mockPricelistRepo.update.mockResolvedValue({ affected: 1 });

      await service.updatePricelistStatus(1, PriceListStatus.ACTIVE);

      expect(invalidateSpy).toHaveBeenCalledWith("pricelists");
      expect(invalidateSpy).toHaveBeenCalledWith("pricelist_items_1");
    });
  });

  describe("removeItemFromPricelist", () => {
    it("throws when item is not in pricelist", async () => {
      mockPricelistItemRepo.delete.mockResolvedValue({ affected: 0 });

      await expect(service.removeItemFromPricelist(1, 99)).rejects.toThrow(
        "Item not found in this pricelist"
      );
    });

    it("invalidates pricelist items cache after removal", async () => {
      const invalidateSpy = vi.spyOn(cache, "invalidate");
      mockPricelistItemRepo.delete.mockResolvedValue({ affected: 1 });

      await service.removeItemFromPricelist(5, 2);

      expect(invalidateSpy).toHaveBeenCalledWith("pricelist_items_5");
    });
  });
});

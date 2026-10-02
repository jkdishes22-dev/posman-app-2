import { describe, it, expect, beforeEach, vi } from "vitest";
import { PricelistService } from "@backend/service/PricelistService";
import { cache } from "@backend/utils/cache";

const mockPricelistItemQb = {
  delete: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue({ affected: 3 }),
};

const mockStationPricelistQb = {
  delete: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue({ affected: 1 }),
};

const makeMockRepo = (qb: any) => ({
  findOne: vi.fn(),
  delete: vi.fn().mockResolvedValue({ affected: 1 }),
  createQueryBuilder: vi.fn(() => qb),
});

const mockPricelistRepo = {
  findOne: vi.fn(),
  delete: vi.fn().mockResolvedValue({ affected: 1 }),
  createQueryBuilder: vi.fn(),
};

const mockPricelistItemRepo = {
  ...makeMockRepo(mockPricelistItemQb),
};

const mockStationPricelistRepo = {
  ...makeMockRepo(mockStationPricelistQb),
};

const mockDataSource = {
  getRepository: vi.fn((entity: any) => {
    const name = typeof entity === "string" ? entity : entity?.name;
    if (name === "Pricelist") return mockPricelistRepo;
    if (name === "PricelistItem") return mockPricelistItemRepo;
    if (name === "StationPricelist") return mockStationPricelistRepo;
    return {};
  }),
};

beforeEach(() => {
  vi.clearAllMocks();
  cache.clear();
});

describe("PricelistService.deletePricelist", () => {
  it("throws 404 when pricelist is not found", async () => {
    mockPricelistRepo.findOne.mockResolvedValue(null);
    const service = new PricelistService(mockDataSource as any);

    await expect(service.deletePricelist(999)).rejects.toMatchObject({
      message: "Pricelist not found",
      statusCode: 404,
    });
  });

  it("throws 400 when trying to delete the default pricelist", async () => {
    mockPricelistRepo.findOne.mockResolvedValue({ id: 1, is_default: true, name: "Default" });
    const service = new PricelistService(mockDataSource as any);

    await expect(service.deletePricelist(1)).rejects.toMatchObject({
      message: "Cannot delete the default pricelist",
      statusCode: 400,
    });
  });

  it("removes all pricelist_item rows before deleting pricelist", async () => {
    mockPricelistRepo.findOne.mockResolvedValue({ id: 2, is_default: false, name: "Test" });
    const service = new PricelistService(mockDataSource as any);
    await service.deletePricelist(2);

    expect(mockPricelistItemQb.where).toHaveBeenCalledWith("pricelist_id = :pricelistId", { pricelistId: 2 });
    expect(mockPricelistItemQb.execute).toHaveBeenCalled();
  });

  it("removes all station_pricelist rows before deleting pricelist", async () => {
    mockPricelistRepo.findOne.mockResolvedValue({ id: 2, is_default: false, name: "Test" });
    const service = new PricelistService(mockDataSource as any);
    await service.deletePricelist(2);

    expect(mockStationPricelistQb.where).toHaveBeenCalledWith("pricelist_id = :pricelistId", { pricelistId: 2 });
    expect(mockStationPricelistQb.execute).toHaveBeenCalled();
  });

  it("hard-deletes the pricelist record", async () => {
    mockPricelistRepo.findOne.mockResolvedValue({ id: 2, is_default: false, name: "Test" });
    const service = new PricelistService(mockDataSource as any);
    await service.deletePricelist(2);

    expect(mockPricelistRepo.delete).toHaveBeenCalledWith(2);
  });

  it("invalidates pricelist caches after deletion", async () => {
    cache.set("pricelists_all", []);
    cache.set("pricelist_items_2", []);
    cache.set("available_pricelists", []);

    mockPricelistRepo.findOne.mockResolvedValue({ id: 2, is_default: false, name: "Test" });
    const service = new PricelistService(mockDataSource as any);
    await service.deletePricelist(2);

    expect(cache.get("pricelists_all")).toBeNull();
    expect(cache.get("pricelist_items_2")).toBeNull();
    expect(cache.get("available_pricelists")).toBeNull();
  });
});

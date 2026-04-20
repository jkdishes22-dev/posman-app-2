import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDataSource, createMockRepository } from "../mocks/createMockDataSource";

const mockAppDataSourceQuery = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock("@backend/config/data-source", () => ({
  AppDataSource: { query: mockAppDataSourceQuery },
}));

import { StationService } from "@backend/service/StationService";
import { cache } from "@backend/utils/cache";

describe("StationService", () => {
  let mockStationRepo: ReturnType<typeof createMockRepository>;
  let mockStationPricelistRepo: ReturnType<typeof createMockRepository>;
  let mockUserStationRepo: ReturnType<typeof createMockRepository>;
  let service: StationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStationRepo = createMockRepository();
    mockStationPricelistRepo = createMockRepository();
    mockUserStationRepo = createMockRepository();
    const mockDs = createMockDataSource({
      Station: mockStationRepo,
      StationPricelist: mockStationPricelistRepo,
      UserStation: mockUserStationRepo,
    });
    service = new StationService(mockDs as any);
  });

  describe("createStation", () => {
    it("saves station and invalidates stations cache", async () => {
      const invalidateSpy = vi.spyOn(cache, "invalidate");
      const station: any = { name: "Bar" };
      mockStationRepo.create.mockReturnValue(station);
      mockStationRepo.save.mockResolvedValue({ id: 1, ...station });

      await service.createStation(station);

      expect(mockStationRepo.save).toHaveBeenCalled();
      expect(invalidateSpy).toHaveBeenCalledWith("stations");
    });
  });

  describe("fetchStations", () => {
    it("returns stations from query builder", async () => {
      const stations = [{ id: 1, name: "Bar" }];
      const qb = mockStationRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue(stations);

      const result = await service.fetchStations({});

      expect(result).toEqual(stations);
    });

    it("caches results on second call with same options", async () => {
      const qb = mockStationRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue([]);

      await service.fetchStations({});
      await service.fetchStations({});

      expect(qb.getMany).toHaveBeenCalledTimes(1);
    });

    it("applies status filter when provided", async () => {
      const qb = mockStationRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue([]);

      await service.fetchStations({ status: "active" });

      expect(qb.where).toHaveBeenCalledWith("station.status = :status", { status: "active" });
    });
  });

  describe("fetchStationPricelist", () => {
    it("calls AppDataSource.query with stationId parameter", async () => {
      mockAppDataSourceQuery.mockResolvedValue([{ id: 1, name: "Standard" }]);

      const result = await service.fetchStationPricelist(5);

      expect(mockAppDataSourceQuery).toHaveBeenCalledWith(
        expect.any(String),
        [5]
      );
      expect(result).toEqual([{ id: 1, name: "Standard" }]);
    });

    it("caches the result on second call", async () => {
      mockAppDataSourceQuery.mockResolvedValue([]);

      await service.fetchStationPricelist(5);
      await service.fetchStationPricelist(5);

      expect(mockAppDataSourceQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe("setUserDefaultStation", () => {
    it("unsets existing default then sets new default", async () => {
      await service.setUserDefaultStation(1, 3);

      expect(mockUserStationRepo.update).toHaveBeenCalledTimes(2);
      expect(mockUserStationRepo.update).toHaveBeenNthCalledWith(
        1,
        { user: { id: 1 } },
        { isDefault: false }
      );
      expect(mockUserStationRepo.update).toHaveBeenNthCalledWith(
        2,
        { user: { id: 1 }, station: { id: 3 } },
        { isDefault: true }
      );
    });

    it("invalidates user default station cache", async () => {
      const invalidateSpy = vi.spyOn(cache, "invalidate");

      await service.setUserDefaultStation(1, 3);

      expect(invalidateSpy).toHaveBeenCalledWith("user_default_station_1");
    });
  });
});

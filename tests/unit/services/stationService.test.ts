import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDataSource, createMockRepository } from "../mocks/createMockDataSource";

const mockAppDataSourceQuery = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock("@backend/config/data-source", () => ({
  AppDataSource: { query: mockAppDataSourceQuery },
}));

import { StationService } from "@backend/service/StationService";
import { cache } from "@backend/utils/cache";
import { UserStationStatus } from "@backend/entities/UserStation";
import { StationStatus } from "@backend/entities/Station";

describe("StationService", () => {
  let mockStationRepo: ReturnType<typeof createMockRepository>;
  let mockStationPricelistRepo: ReturnType<typeof createMockRepository>;
  let mockUserStationRepo: ReturnType<typeof createMockRepository>;
  let service: StationService;

  beforeEach(() => {
    vi.clearAllMocks();
    cache.clear();
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

  describe("getUserStations", () => {
    it("runs raw SQL join and maps rows to Station instances", async () => {
      const row = {
        id: 2,
        name: "Kitchen",
        status: StationStatus.ACTIVE,
        description: "Main",
        created_at: new Date("2024-06-01T12:00:00Z"),
        updated_at: null,
        created_by: null,
        updated_by: null,
      };
      mockUserStationRepo.manager.query.mockResolvedValue([row]);

      const result = await service.getUserStations(99);

      expect(mockUserStationRepo.manager.query).toHaveBeenCalledTimes(1);
      expect(mockUserStationRepo.manager.query).toHaveBeenCalledWith(
        expect.stringMatching(/FROM user_station us[\s\S]*INNER JOIN station s/),
        [99, UserStationStatus.ACTIVE],
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
      expect(result[0].name).toBe("Kitchen");
      expect(result[0].status).toBe(StationStatus.ACTIVE);
    });

    it("caches and does not query twice for same userId", async () => {
      const row = {
        id: 1,
        name: "A",
        status: StationStatus.ACTIVE,
        description: "",
        created_at: new Date(),
        updated_at: null,
        created_by: null,
        updated_by: null,
      };
      mockUserStationRepo.manager.query.mockResolvedValue([row]);
      await service.getUserStations(501);
      await service.getUserStations(501);
      expect(mockUserStationRepo.manager.query).toHaveBeenCalledTimes(1);
    });

    it("returns empty array on query failure", async () => {
      mockUserStationRepo.manager.query.mockRejectedValue(new Error("db down"));
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await service.getUserStations(77);
      expect(result).toEqual([]);
      errSpy.mockRestore();
    });
  });

  describe("getAvailableUsers", () => {
    it("queries with sales, admin, and supervisor roles", async () => {
      mockAppDataSourceQuery.mockResolvedValue([]);

      await service.getAvailableUsers(1);

      expect(mockAppDataSourceQuery).toHaveBeenCalledWith(
        expect.stringMatching(/r\.name IN \('sales', 'admin', 'supervisor'\)/),
        [1]
      );
    });

    it("returns users from query result", async () => {
      const users = [
        { id: 1, firstName: "Alice", lastName: "Smith", username: "alice", role_name: "supervisor" },
        { id: 2, firstName: "Bob", lastName: "Jones", username: "bob", role_name: "sales" },
      ];
      mockAppDataSourceQuery.mockResolvedValue(users);

      const result = await service.getAvailableUsers(2);

      expect(result).toEqual(users);
    });

    it("excludes users already assigned to the station", async () => {
      mockAppDataSourceQuery.mockResolvedValue([]);

      await service.getAvailableUsers(5);

      expect(mockAppDataSourceQuery).toHaveBeenCalledWith(
        expect.stringMatching(/u\.id NOT IN[\s\S]*us\.station_id = \?/),
        [5]
      );
    });

    it("caches result and does not query twice for same stationId", async () => {
      mockAppDataSourceQuery.mockResolvedValue([{ id: 1, firstName: "Alice", lastName: "Smith", username: "alice", role_name: "supervisor" }]);

      await service.getAvailableUsers(3);
      await service.getAvailableUsers(3);

      expect(mockAppDataSourceQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe("getUserDefaultStation", () => {
    it("returns null when no default row", async () => {
      mockUserStationRepo.manager.query.mockResolvedValue([]);
      const result = await service.getUserDefaultStation(1);
      expect(result).toBeNull();
    });

    it("returns mapped Station for first row and filters is_default + active", async () => {
      const row = {
        id: 3,
        name: "Bar",
        status: StationStatus.ACTIVE,
        description: "",
        created_at: new Date(),
        updated_at: null,
        created_by: null,
        updated_by: null,
      };
      mockUserStationRepo.manager.query.mockResolvedValue([row]);

      const result = await service.getUserDefaultStation(7);

      expect(mockUserStationRepo.manager.query).toHaveBeenCalledWith(
        expect.stringMatching(/is_default\s*=\s*1/),
        [7, UserStationStatus.ACTIVE, StationStatus.ACTIVE],
      );
      expect(result?.id).toBe(3);
      expect(result?.name).toBe("Bar");
    });

    it("uses cache on second call", async () => {
      mockUserStationRepo.manager.query.mockResolvedValue([
        {
          id: 9,
          name: "Cached",
          status: StationStatus.ACTIVE,
          description: "",
          created_at: new Date(),
          updated_at: null,
          created_by: null,
          updated_by: null,
        },
      ]);
      await service.getUserDefaultStation(888);
      await service.getUserDefaultStation(888);
      expect(mockUserStationRepo.manager.query).toHaveBeenCalledTimes(1);
    });
  });
});

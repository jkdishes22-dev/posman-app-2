import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScopeService } from "@backend/service/ScopeService";
import {
  createMockDataSource,
  createMockRepository,
} from "../mocks/createMockDataSource";

describe("ScopeService", () => {
  let mockScopeRepo: ReturnType<typeof createMockRepository>;
  let service: ScopeService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockScopeRepo = createMockRepository();
    const mockDs = createMockDataSource({ PermissionScope: mockScopeRepo });
    service = new ScopeService(mockDs as any);
  });

  describe("fetchScopes", () => {
    it("returns scopes from repository on first call", async () => {
      const scopes = [{ id: 1, name: "admin" }];
      mockScopeRepo.find.mockResolvedValue(scopes);

      const result = await service.fetchScopes();

      expect(result).toEqual(scopes);
    });

    it("returns cached scopes on second call without hitting repository", async () => {
      const scopes = [{ id: 1, name: "admin" }];
      mockScopeRepo.find.mockResolvedValue(scopes);

      await service.fetchScopes();
      await service.fetchScopes();

      expect(mockScopeRepo.find).toHaveBeenCalledTimes(1);
    });
  });

  describe("fetchScopePermissions", () => {
    it("fetches permissions for a specific scope id", async () => {
      const scopeWithPerms = [{ id: 2, name: "billing", permissions: [{ id: 1, name: "view_bills" }] }];
      mockScopeRepo.find.mockResolvedValue(scopeWithPerms);

      const result = await service.fetchScopePermissions(2);

      expect(mockScopeRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 2 } })
      );
      expect(result).toEqual(scopeWithPerms);
    });

    it("caches scope permissions per scopeId", async () => {
      mockScopeRepo.find.mockResolvedValue([]);

      await service.fetchScopePermissions(3);
      await service.fetchScopePermissions(3);

      expect(mockScopeRepo.find).toHaveBeenCalledTimes(1);
    });

    it("uses separate cache keys for different scope ids", async () => {
      mockScopeRepo.find.mockResolvedValue([]);

      await service.fetchScopePermissions(1);
      await service.fetchScopePermissions(2);

      expect(mockScopeRepo.find).toHaveBeenCalledTimes(2);
    });
  });
});

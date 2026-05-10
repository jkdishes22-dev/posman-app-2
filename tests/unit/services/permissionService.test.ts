import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRepository, createMockDataSource } from "../mocks/createMockDataSource";

const mockAppDataSourceQuery = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock("@backend/config/data-source", () => ({
  AppDataSource: { query: mockAppDataSourceQuery },
}));

import { PermissionService } from "@backend/service/PermissionService";
import { cache } from "@backend/utils/cache";

describe("PermissionService", () => {
  let mockPermissionRepo: ReturnType<typeof createMockRepository>;
  let mockScopeRepo: ReturnType<typeof createMockRepository>;
  let service: PermissionService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissionRepo = createMockRepository();
    mockScopeRepo = createMockRepository();
    const mockDs = createMockDataSource({
      Permission: mockPermissionRepo,
      PermissionScope: mockScopeRepo,
    });
    service = new PermissionService(mockDs as any);
  });

  describe("fetchPermissions", () => {
    it("returns permissions from repository on first call", async () => {
      const perms = [{ id: 1, name: "view_bills" }];
      mockPermissionRepo.find.mockResolvedValue(perms);

      const result = await service.fetchPermissions();

      expect(result).toEqual(perms);
    });

    it("returns cached permissions on second call", async () => {
      mockPermissionRepo.find.mockResolvedValue([]);

      await service.fetchPermissions();
      await service.fetchPermissions();

      expect(mockPermissionRepo.find).toHaveBeenCalledTimes(1);
    });
  });

  describe("createPermission", () => {
    it("creates a new scope when scope does not exist", async () => {
      mockScopeRepo.findOneBy.mockResolvedValue(null);
      const newScope = { id: 1, name: "billing" };
      mockScopeRepo.create.mockReturnValue(newScope);
      mockScopeRepo.save.mockResolvedValue(newScope);
      mockPermissionRepo.save.mockResolvedValue({ id: 1, name: "view_bills" });

      await service.createPermission({ name: "view_bills", scope: "billing" });

      expect(mockScopeRepo.create).toHaveBeenCalledWith({ name: "billing" });
    });

    it("reuses existing scope when it already exists", async () => {
      const existingScope = { id: 5, name: "billing" };
      mockScopeRepo.findOneBy.mockResolvedValue(existingScope);
      mockPermissionRepo.save.mockResolvedValue({ id: 1, name: "view_bills" });

      await service.createPermission({ name: "view_bills", scope: "billing" });

      expect(mockScopeRepo.create).not.toHaveBeenCalled();
    });

    it("invalidates permission and role_permissions caches after creation", async () => {
      const invalidateManySpy = vi.spyOn(cache, "invalidateMany");
      mockScopeRepo.findOneBy.mockResolvedValue({ id: 1, name: "billing" });
      mockPermissionRepo.save.mockResolvedValue({ id: 1 });

      await service.createPermission({ name: "view_bills", scope: "billing" });

      expect(invalidateManySpy).toHaveBeenCalledWith(["permissions", "role_permissions"]);
    });
  });

  describe("fetchPermissionsByRole", () => {
    it("calls AppDataSource.query with roleId parameter", async () => {
      mockAppDataSourceQuery.mockResolvedValue([{ id: 1, name: "view_bills" }]);

      const result = await service.fetchPermissionsByRole(3);

      expect(mockAppDataSourceQuery).toHaveBeenCalledWith(
        expect.stringContaining("role_id"),
        [3]
      );
      expect(result).toEqual([{ id: 1, name: "view_bills" }]);
    });

    it("caches role permissions on second call", async () => {
      mockAppDataSourceQuery.mockResolvedValue([]);

      await service.fetchPermissionsByRole(3);
      await service.fetchPermissionsByRole(3);

      expect(mockAppDataSourceQuery).toHaveBeenCalledTimes(1);
    });
  });
});

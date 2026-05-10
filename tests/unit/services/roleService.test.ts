import { describe, it, expect, vi, beforeEach } from "vitest";
import { RoleService } from "@backend/service/RoleService";
import { cache } from "@backend/utils/cache";
import {
  createMockDataSource,
  createMockRepository,
  createMockTransactionalEntityManager,
} from "../mocks/createMockDataSource";

describe("RoleService", () => {
  let mockRoleRepo: ReturnType<typeof createMockRepository>;
  let mockPermissionRepo: ReturnType<typeof createMockRepository>;
  let mockUserRoleRepo: ReturnType<typeof createMockRepository>;
  let service: RoleService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRoleRepo = createMockRepository();
    mockPermissionRepo = createMockRepository();
    mockUserRoleRepo = createMockRepository();
    const mockDs = createMockDataSource({
      Role: mockRoleRepo,
      Permission: mockPermissionRepo,
      UserRole: mockUserRoleRepo,
    });
    service = new RoleService(mockDs as any);
  });

  describe("fetchRoles", () => {
    it("returns roles from repository on first call", async () => {
      const roles = [{ id: 1, name: "Admin" }];
      mockRoleRepo.find.mockResolvedValue(roles);

      const result = await service.fetchRoles();

      expect(result).toEqual(roles);
    });

    it("returns cached roles on second call", async () => {
      mockRoleRepo.find.mockResolvedValue([]);

      await service.fetchRoles();
      await service.fetchRoles();

      expect(mockRoleRepo.find).toHaveBeenCalledTimes(1);
    });
  });

  describe("createRole", () => {
    it("saves the role and invalidates roles cache", async () => {
      const invalidateSpy = vi.spyOn(cache, "invalidate");
      const role: any = { name: "Supervisor" };
      mockRoleRepo.create.mockReturnValue(role);
      mockRoleRepo.save.mockResolvedValue({ id: 1, ...role });

      await service.createRole(role);

      expect(mockRoleRepo.save).toHaveBeenCalled();
      expect(invalidateSpy).toHaveBeenCalledWith("roles");
    });
  });

  describe("addPermissionToRole", () => {
    it("throws 'Role or Permission not found' when role is null", async () => {
      const txn = createMockTransactionalEntityManager();
      txn.findOne.mockResolvedValue(null);
      txn.findOneBy.mockResolvedValue({ id: 2 });
      mockRoleRepo.manager.transaction.mockImplementationOnce(async (cb: any) =>
        cb(txn)
      );

      await expect(service.addPermissionToRole(1, 2)).rejects.toThrow(
        "Role or Permission not found"
      );
    });

    it("throws 'Role or Permission not found' when permission is null", async () => {
      const txn = createMockTransactionalEntityManager();
      txn.findOne.mockResolvedValue({ id: 1, permissions: [] });
      txn.findOneBy.mockResolvedValue(null);
      mockRoleRepo.manager.transaction.mockImplementationOnce(async (cb: any) =>
        cb(txn)
      );

      await expect(service.addPermissionToRole(1, 2)).rejects.toThrow(
        "Role or Permission not found"
      );
    });

    it("does not add duplicate permission if role already has it", async () => {
      const perm = { id: 2 };
      const role = { id: 1, permissions: [perm] };
      const txn = createMockTransactionalEntityManager();
      txn.findOne.mockResolvedValue(role);
      txn.findOneBy.mockResolvedValue(perm);
      mockRoleRepo.manager.transaction.mockImplementationOnce(async (cb: any) =>
        cb(txn)
      );

      await service.addPermissionToRole(1, 2);

      expect(txn.save).not.toHaveBeenCalled();
    });

    it("adds permission and invalidates caches when permission is new", async () => {
      const invalidateManySpy = vi.spyOn(cache, "invalidateMany");
      const perm = { id: 2 };
      const role = { id: 1, permissions: [] };
      const txn = createMockTransactionalEntityManager();
      txn.findOne.mockResolvedValue(role);
      txn.findOneBy.mockResolvedValue(perm);
      txn.save.mockResolvedValue(role);
      mockRoleRepo.manager.transaction.mockImplementationOnce(async (cb: any) =>
        cb(txn)
      );

      await service.addPermissionToRole(1, 2);

      expect(txn.save).toHaveBeenCalled();
      expect(invalidateManySpy).toHaveBeenCalledWith(["roles", "role_permissions_1"]);
    });
  });

  describe("assignRoleToUser", () => {
    it("deletes all existing user roles before assigning new one", async () => {
      const qb = mockUserRoleRepo.createQueryBuilder();
      qb.getOne.mockResolvedValue(null);
      mockUserRoleRepo.save.mockResolvedValue({});

      await service.assignRoleToUser(5, 2);

      expect(mockUserRoleRepo.delete).toHaveBeenCalledWith({ user: { id: 5 } });
      expect(mockUserRoleRepo.createQueryBuilder).toHaveBeenCalledWith("ur");
      expect(qb.where).toHaveBeenCalledWith("ur.user_id = :userId", { userId: 5 });
      expect(qb.andWhere).toHaveBeenCalledWith("ur.role_id = :roleId", { roleId: 2 });
    });

    it("invalidates user-related caches after role assignment", async () => {
      const invalidateManySpy = vi.spyOn(cache, "invalidateMany");
      const qb = mockUserRoleRepo.createQueryBuilder();
      qb.getOne.mockResolvedValue(null);
      mockUserRoleRepo.save.mockResolvedValue({});

      await service.assignRoleToUser(5, 2);

      expect(invalidateManySpy).toHaveBeenCalledWith(["user_roles_permissions_5", "user_roles_stations_5", "user_5"]);
    });
  });
});

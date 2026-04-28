import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserService } from "@backend/service/UserService";
import { cache } from "@backend/utils/cache";
import {
  createMockDataSource,
  createMockRepository,
  createMockTransactionalEntityManager,
} from "../mocks/createMockDataSource";

describe("UserService", () => {
  let mockUserRepo: ReturnType<typeof createMockRepository>;
  let mockRoleRepo: ReturnType<typeof createMockRepository>;
  let mockUserStationRepo: ReturnType<typeof createMockRepository>;
  let service: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRepo = createMockRepository();
    mockRoleRepo = createMockRepository();
    mockUserStationRepo = createMockRepository();
    const mockDs = createMockDataSource({
      User: mockUserRepo,
      Role: mockRoleRepo,
      UserStation: mockUserStationRepo,
    });
    service = new UserService(mockDs as any);
  });

  describe("createUser", () => {
    it("throws when username already exists", async () => {
      const txn = createMockTransactionalEntityManager();
      txn.findOne.mockResolvedValue({ id: 1, username: "existing" });
      mockUserRepo.manager.transaction.mockImplementationOnce(async (cb: any) => cb(txn));

      await expect(
        service.createUser("existing", "pass", "John", "Doe", 1, 1)
      ).rejects.toThrow("User already exists");
    });

    it("creates user with role when role exists", async () => {
      const txn = createMockTransactionalEntityManager();
      txn.findOne.mockResolvedValueOnce(null); // no existing user
      txn.create.mockReturnValue({ username: "newuser", roles: [] });
      txn.findOne.mockResolvedValueOnce({ id: 1, name: "Admin" }); // role found
      txn.save.mockResolvedValue({ id: 10, username: "newuser" });
      mockUserRepo.manager.transaction.mockImplementationOnce(async (cb: any) => cb(txn));

      const result = await service.createUser("newuser", "hashed", "Jane", "Doe", 1, 1);

      expect(txn.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 10, username: "newuser" });
    });

    it("invalidates users cache after creation", async () => {
      const invalidateSpy = vi.spyOn(cache, "invalidate");
      const txn = createMockTransactionalEntityManager();
      txn.findOne.mockResolvedValueOnce(null);
      txn.create.mockReturnValue({ username: "newuser", roles: [] });
      txn.findOne.mockResolvedValueOnce(null); // role not found
      txn.save.mockResolvedValue({ id: 1 });
      mockUserRepo.manager.transaction.mockImplementationOnce(async (cb: any) => cb(txn));

      await service.createUser("newuser", "pass", "Jane", "Doe", 1, 1);

      expect(invalidateSpy).toHaveBeenCalledWith("users");
    });
  });

  describe("getUserByUsername", () => {
    it("returns null when user not found", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const result = await service.getUserByUsername("nobody");

      expect(result).toBeNull();
    });

    it("caches result on second call when includePassword is false", async () => {
      const user = { id: 1, username: "admin", password: "hashed" };
      mockUserRepo.findOne.mockResolvedValue(user);

      await service.getUserByUsername("admin", false);
      await service.getUserByUsername("admin", false);

      expect(mockUserRepo.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe("getUsers", () => {
    it("applies role filter when provided", async () => {
      const qb = mockUserRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      qb.getCount.mockResolvedValue(0);

      await service.getUsers("Admin");

      expect(qb.andWhere).toHaveBeenCalledWith("role.name = :role", { role: "Admin" });
    });

    it("caches results for non-search queries", async () => {
      const qb = mockUserRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      qb.getCount.mockResolvedValue(0);

      await service.getUsers(undefined, 1, 10);
      await service.getUsers(undefined, 1, 10);

      expect(qb.getMany).toHaveBeenCalledTimes(1);
    });

    it("does not cache search query results", async () => {
      const qb = mockUserRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      qb.getCount.mockResolvedValue(0);

      await service.getUsers(undefined, 1, 10, "john");
      await service.getUsers(undefined, 1, 10, "john");

      expect(qb.getMany).toHaveBeenCalledTimes(2);
    });
  });

  describe("getUserWithRolesAndPermissions", () => {
    it("throws when user not found", async () => {
      mockUserRepo.manager.query.mockResolvedValue([]);

      await expect(service.getUserWithRolesAndPermissions(99)).rejects.toThrow(
        "User not found"
      );
    });

    it("returns user with roles and permissions from raw query results", async () => {
      const rawResults = [
        {
          user_id: 1,
          username: "admin",
          firstName: "Admin",
          lastName: "User",
          user_status: "active",
          role_id: 2,
          role_name: "Admin",
          permission_id: 3,
          permission_name: "view_bills",
        },
      ];
      mockUserRepo.manager.query.mockResolvedValue(rawResults);

      const result = await service.getUserWithRolesAndPermissions(1);

      expect(result.id).toBe(1);
      expect(result.roles).toHaveLength(1);
      expect(result.permissions).toHaveLength(1);
    });
  });
});

import { Role } from "@entities/Role";
import { Permission } from "@entities/Permission";
import { UserRole } from "@entities/UserRole";
import { DataSource, Repository } from "typeorm";
import { cache } from "@backend/utils/cache";

export class RoleService {
  private roleRepository: Repository<Role>;

  constructor(datasource: DataSource) {
    this.roleRepository = datasource.getRepository(Role);
  }

  async fetchRoles() {
    const cacheKey = "roles_all";

    // Try cache first
    const cached = cache.get<Role[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.roleRepository.find({
      select: ["id", "name", "created_at", "updated_at"]
    });

    // Cache the result
    cache.set(cacheKey, result);
    return result;
  }

  async createRole(newRole: Role) {
    const role = this.roleRepository.create(newRole);
    const saved = await this.roleRepository.save(role);

    // Invalidate cache after creating role
    cache.invalidate("roles");

    return saved;
  }

  /**
   *
   * @param roleId
   * @param permissionId
   * @returns
   */
  async addPermissionToRole(roleId: any, permissionId: any) {
    return await this.roleRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const role = await transactionalEntityManager.findOne(Role, {
          where: { id: roleId },
          relations: ["permissions"],
        });
        const permission = await transactionalEntityManager.findOneBy(
          Permission,
          {
            id: permissionId,
          },
        );

        if (role && permission) {
          const hasPermission = role.permissions.some(
            (perm) => perm.id === permission.id,
          );
          if (!hasPermission) {
            role.permissions.push(permission);
            await transactionalEntityManager.save(role);

            // Invalidate cache after adding permission
            cache.invalidateMany(["roles", `role_permissions_${roleId}`]);
          }
        } else {
          throw new Error("Role or Permission not found");
        }
      },
    );
  }

  async assignRoleToUser(userId: number, roleId: number) {
    try {
      const saved = await this.roleRepository.manager.transaction(async (manager) => {
        await manager
          .createQueryBuilder()
          .delete()
          .from(UserRole)
          .where("user_id = :userId", { userId })
          .execute();

        const userRole = new UserRole();
        userRole.user = { id: userId } as any;
        userRole.role = { id: roleId } as any;
        return manager.save(UserRole, userRole);
      });

      cache.invalidateMany([`user_roles_permissions_${userId}`, `user_roles_stations_${userId}`, `user_${userId}`]);
      return saved;
    } catch (error: any) {
      console.error(`Error assigning role ${roleId} to user ${userId}:`, error);
      throw new Error(error?.message || "Failed to assign role to user");
    }
  }

  /**
   * Remove a permission from a role
   * @param roleId
   * @param permissionId
   * @returns
   */
  async removePermissionFromRole(roleId: any, permissionId: any) {
    return await this.roleRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const role = await transactionalEntityManager.findOne(Role, {
          where: { id: roleId },
          relations: ["permissions"],
        });
        const permission = await transactionalEntityManager.findOneBy(
          Permission,
          {
            id: permissionId,
          },
        );

        if (role && permission) {
          // Remove the permission from the role's permissions array
          role.permissions = role.permissions.filter(
            (perm) => perm.id !== permission.id,
          );
          await transactionalEntityManager.save(role);

          // Invalidate cache after removing permission
          cache.invalidateMany(["roles", `role_permissions_${roleId}`]);
        } else {
          throw new Error("Role or Permission not found");
        }
      },
    );
  }
}

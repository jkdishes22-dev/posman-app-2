import { Role } from "@entities/Role";
import { Permission } from "@entities/Permission";
import { UserRole } from "@entities/UserRole";
import { DataSource, Repository } from "typeorm";
import { User } from "@backend/entities/User";
import { cache } from "@backend/utils/cache";

export class RoleService {
  private roleRepository: Repository<Role>;
  private permissionRepository: Repository<Permission>;
  private userRoleRepository: Repository<UserRole>;

  constructor(datasource: DataSource) {
    this.roleRepository = datasource.getRepository(Role);
    this.permissionRepository = datasource.getRepository(Permission);
    this.userRoleRepository = datasource.getRepository(UserRole);
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
            cache.invalidate("roles");
            cache.invalidate(`role_permissions_${roleId}`);
          }
        } else {
          throw new Error("Role or Permission not found");
        }
      },
    );
  }

  async assignRoleToUser(userId: number, roleId: number) {
    await this.userRoleRepository.delete({ user: { id: userId } });
    const existing = await this.userRoleRepository
      .createQueryBuilder("ur")
      .where("ur.user_id = :userId", { userId })
      .andWhere("ur.role_id = :roleId", { roleId })
      .getOne();
    if (!existing) {
      const userRole = new UserRole();
      userRole.user = { id: userId } as any;
      userRole.role = { id: roleId } as any;
      const saved = await this.userRoleRepository.save(userRole);

      // Invalidate user-related caches after assigning role
      cache.invalidate(`user_roles_permissions_${userId}`);
      cache.invalidate(`user_roles_stations_${userId}`);
      cache.invalidate(`user_${userId}`);

      return saved;
    }

    // Invalidate user-related caches even if role already exists
    cache.invalidate(`user_roles_permissions_${userId}`);
    cache.invalidate(`user_roles_stations_${userId}`);
    cache.invalidate(`user_${userId}`);

    // If already exists, return existing
    return existing;
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
          cache.invalidate("roles");
          cache.invalidate(`role_permissions_${roleId}`);
        } else {
          throw new Error("Role or Permission not found");
        }
      },
    );
  }
}

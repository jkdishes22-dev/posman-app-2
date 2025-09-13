import { Role } from "@entities/Role";
import { Permission } from "@entities/Permission";
import { UserRole } from "@entities/UserRole";
import { DataSource, Repository } from "typeorm";
import { User } from "@backend/entities/User";

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
    return await this.roleRepository.find();
  }

  async createRole(newRole: Role) {
    const role = this.roleRepository.create(newRole);
    return await this.roleRepository.save(role);
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
          }
        } else {
          throw new Error("Role or Permission not found");
        }
      },
    );
  }

  async assignRoleToUser(userId: number, roleId: number) {
    await this.userRoleRepository.delete({ user: { id: userId } });
    const existing = await this.userRoleRepository.findOne({ where: { user: { id: userId }, role: { id: roleId } } });
    if (!existing) {
      const userRole = new UserRole();
      userRole.user = { id: userId } as any;
      userRole.role = { id: roleId } as any;
      return await this.userRoleRepository.save(userRole);
    }
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
        } else {
          throw new Error("Role or Permission not found");
        }
      },
    );
  }
}

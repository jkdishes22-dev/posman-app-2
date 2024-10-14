import { AppDataSource } from "@backend/config/data-source";
import { Role } from "@entities/Role";
import { Permission } from "@entities/Permission";
import { UserRole } from "@entities/UserRole";

export class RoleService {
  async fetchRoles() {
    return await AppDataSource.getRepository(Role).find();
  }

  async createRole(newRole) {
    const roleRepository = AppDataSource.getRepository(Role);
    const role = roleRepository.create(newRole);
    return await roleRepository.save(role);
  }

  async addPermissionToRole(roleId, permissionId) {
    const roleRepository = AppDataSource.getRepository(Role);
    const permissionRepository = AppDataSource.getRepository(Permission);

    const role = await roleRepository.findOneBy({ id: roleId });
    const permission = await permissionRepository.findOneBy({
      id: permissionId,
    });

    if (role && permission) {
      role.permissions = [...role.permissions, permission];
      return await roleRepository.save(role);
    } else {
      throw new Error("Role or Permission not found");
    }
  }

  async assignRoleToUser(userId, roleId) {
    const userRoleRepository = AppDataSource.getRepository(UserRole);
    const userRole = new UserRole();
    userRole.user = userId;
    userRole.role = roleId;

    return await userRoleRepository.save(userRole);
  }
}

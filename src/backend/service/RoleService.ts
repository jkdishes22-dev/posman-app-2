import { AppDataSource } from "@backend/config/data-source";
import { Role } from "@entities/Role";
import { Permission } from "@entities/Permission";
import { UserRole } from "@entities/UserRole";
import { DeepPartial, Repository } from "typeorm";
import { User } from "@backend/entities/User";

export class RoleService {
  private roleRepository: Repository<Role>;
  private permissionRepository: Repository<Permission>;
  private userRoleRepository: Repository<UserRole>

  constructor() {
    this.roleRepository = AppDataSource.getRepository(Role);
    this.permissionRepository = AppDataSource.getRepository(Permission);
    this.userRoleRepository = AppDataSource.getRepository(UserRole);
  }

  async fetchRoles() {
    return await this.roleRepository.find();
  }

  async createRole(newRole: Role) {
    const role = this.roleRepository.create(newRole);
    return await this.roleRepository.save(role);
  }

  async addPermissionToRole(roleId: any, permissionId: any) {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ["permissions"]
    });
    const permission = await this.permissionRepository.findOneBy({
      id: permissionId,
    });

    if (role && permission) {
      const hasPermission = role.permissions.some((perm) => perm.id === permission.id);
      if (!hasPermission) {
        role.permissions.push(permission);
        await this.roleRepository.save(role);
      }
    } else {
      throw new Error("Role or Permission not found");
    }
  }

  async assignRoleToUser(userId: User, roleId: Role) {
    const userRole = new UserRole();
    userRole.user = userId;
    userRole.role = roleId;

    return await this.userRoleRepository.save(userRole);
  }
}

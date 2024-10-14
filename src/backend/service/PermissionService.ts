import { AppDataSource } from "@backend/config/data-source";
import { Permission } from "@entities/Permission";
import { PermissionScope } from "@entities/PermissionScope";

export class PermissionService {
  async fetchPermissions() {
    return await AppDataSource.getRepository(Permission).find({
      relations: ["scope"],
    });
  }

  async createPermission(newPermission) {
    const permissionRepository = AppDataSource.getRepository(Permission);
    const scopeRepository = AppDataSource.getRepository(PermissionScope);

    let scope = await scopeRepository.findOneBy({ name: newPermission.scope });
    if (!scope) {
      scope = scopeRepository.create({ name: newPermission.scope });
      scope = await scopeRepository.save(scope);
    }

    const permission = permissionRepository.create({
      name: newPermission.name,
      scope: scope,
    });

    return await permissionRepository.save(permission);
  }

  async fetchPermissionsByRole(roleId) {
    const query = `
      SELECT p.id, p.name, ps.name AS scope 
      FROM role_permissions rp
      LEFT JOIN permissions p ON rp.permission_id = p.id
      LEFT JOIN permission_scope ps ON ps.id = p.scope_id
      WHERE rp.role_id = ?
    `;

    return await AppDataSource.query(query, [roleId]);
  }
}

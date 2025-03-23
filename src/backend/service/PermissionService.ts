import { AppDataSource } from "@backend/config/data-source";
import { Permission } from "@entities/Permission";
import { PermissionScope } from "@entities/PermissionScope";
import { DataSource, Repository } from "typeorm";

export class PermissionService {
  private permissionRepository: Repository<Permission>;
  private scopeRepository: Repository<PermissionScope>;

  constructor(datasource: DataSource) {
    this.permissionRepository = datasource.getRepository(Permission);
    this.scopeRepository = datasource.getRepository(PermissionScope);
  }

  async fetchPermissions() {
    return await this.permissionRepository.find({
      relations: ["scope"],
    });
  }

  async createPermission(newPermission) {
    let scope = await this.scopeRepository.findOneBy({ name: newPermission.scope });
    if (!scope) {
      scope = this.scopeRepository.create({ name: newPermission.scope });
      scope = await this.scopeRepository.save(scope);
    }

    const permission = this.permissionRepository.create({
      name: newPermission.name,
      scope: scope,
    });

    return await this.permissionRepository.save(permission);
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


import { AppDataSource } from "@backend/config/data-source";
import { Permission } from "@entities/Permission";
import { PermissionScope } from "@entities/PermissionScope";
import { DataSource, Repository } from "typeorm";
import { cache } from "@backend/utils/cache";

export class PermissionService {
  private permissionRepository: Repository<Permission>;
  private scopeRepository: Repository<PermissionScope>;

  constructor(datasource: DataSource) {
    this.permissionRepository = datasource.getRepository(Permission);
    this.scopeRepository = datasource.getRepository(PermissionScope);
  }

  async fetchPermissions() {
    const cacheKey = "permissions_all";

    // Try cache first
    const cached = cache.get<Permission[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.permissionRepository.find({
      relations: ["scope"],
      select: {
        id: true,
        name: true,
        scope: {
          id: true,
          name: true,
        }
      }
    });

    // Cache the result
    cache.set(cacheKey, result);
    return result;
  }

  async createPermission(newPermission) {
    let scope = await this.scopeRepository.findOneBy({
      name: newPermission.scope,
    });
    if (!scope) {
      scope = this.scopeRepository.create({ name: newPermission.scope });
      scope = await this.scopeRepository.save(scope);

      // Invalidate cache after creating scope
      cache.invalidate("scopes");
      cache.invalidate("api_scopes");
    }

    const permission = this.permissionRepository.create({
      name: newPermission.name,
      scope: scope,
    });

    const saved = await this.permissionRepository.save(permission);

    // Invalidate cache after creating permission
    cache.invalidate("permissions");
    cache.invalidate("role_permissions");

    return saved;
  }

  async fetchPermissionsByRole(roleId) {
    const cacheKey = `role_permissions_${roleId}`;

    // Try cache first
    const cached = cache.get<any[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const query = `
      SELECT p.id, p.name, ps.name AS scope 
      FROM role_permissions rp
      LEFT JOIN permissions p ON rp.permission_id = p.id
      LEFT JOIN permission_scope ps ON ps.id = p.scope_id
      WHERE rp.role_id = ?
    `;

    const result = await AppDataSource.query(query, [roleId]);

    // Cache the result
    cache.set(cacheKey, result);
    return result;
  }
}

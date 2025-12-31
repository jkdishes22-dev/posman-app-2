import { PermissionScope } from "@entities/PermissionScope";
import { DataSource, Repository } from "typeorm";
import { cache } from "@backend/utils/cache";

export class ScopeService {
  private permissionScopeRepository: Repository<PermissionScope>;

  constructor(datasource: DataSource) {
    this.permissionScopeRepository = datasource.getRepository(PermissionScope);
  }

  async fetchScopes() {
    const cacheKey = "scopes_all";

    // Try cache first
    const cached = cache.get<PermissionScope[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.permissionScopeRepository.find({
      select: ["id", "name", "created_at", "updated_at"]
    });

    // Cache the result
    cache.set(cacheKey, result);
    return result;
  }

  async fetchScopePermissions(scopeId: number) {
    const cacheKey = `scope_permissions_${scopeId}`;

    // Try cache first
    const cached = cache.get<PermissionScope[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.permissionScopeRepository.find({
      where: {
        id: scopeId,
      },
      relations: ["permissions"],
      select: {
        id: true,
        name: true,
        permissions: {
          id: true,
          name: true
        }
      }
    });

    // Cache the result
    cache.set(cacheKey, result);
    return result;
  }
}

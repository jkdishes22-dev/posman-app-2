import { AppDataSource } from "@backend/config/data-source";
import { PermissionScope } from "@entities/PermissionScope";

export class ScopeService {
  private permissionScopeRepository =
    AppDataSource.getRepository(PermissionScope);

  async fetchScopes() {
    return await this.permissionScopeRepository.find();
  }
}

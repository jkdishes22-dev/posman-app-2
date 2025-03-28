import { PermissionScope } from "@entities/PermissionScope";
import { DataSource, Repository } from "typeorm";

export class ScopeService {
  private permissionScopeRepository: Repository<PermissionScope>;

  constructor(datasource: DataSource) {
    this.permissionScopeRepository = datasource.getRepository(PermissionScope);
  }

  async fetchScopes() {
    return await this.permissionScopeRepository.find();
  }

  async fetchScopePermissions(scopeId: number) {
    return await this.permissionScopeRepository.find({
      where: {
        id: scopeId,
      },
      relations: ["permissions"],
    });
  }
}

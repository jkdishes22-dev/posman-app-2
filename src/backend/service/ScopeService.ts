import { PermissionScope } from "@entities/PermissionScope";
import Container from "typedi";
import { Repository, DataSource } from "typeorm";

export class ScopeService {

 private permissionScopeRepository: Repository<PermissionScope>;
  private dataSource = Container.get<DataSource>('DATA_SOURCE');
    
        constructor() {
        this.permissionScopeRepository = this.dataSource.getRepository(PermissionScope);
    }

  async fetchScopes() {
    return await this.permissionScopeRepository.find();
  }

  async fetchScopePermissions(scopeId: number) {
    return await this.permissionScopeRepository.find({
      where: {
        id: scopeId
      },
      relations: ["permissions"]
    });
  }
  
}

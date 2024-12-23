import { getDataSource } from "@backend/config/data-source";
import { Repository, ObjectLiteral, EntityTarget } from "typeorm";

export class BaseService {
  async getRepository(entity: EntityTarget<ObjectLiteral>) {
    const dataSource = await getDataSource();
    return dataSource.getRepository(entity);
  }
}

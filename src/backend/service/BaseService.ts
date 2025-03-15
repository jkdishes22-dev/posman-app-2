import AppDataSource from "@backend/config/data-source";
import { ObjectLiteral, EntityTarget } from "typeorm";

export class BaseService {
  async getRepository(entity: EntityTarget<ObjectLiteral>) {
    const dataSource = AppDataSource;
    return dataSource.getRepository(entity);
  }
}

import { DataSource, Repository, EntityTarget } from "typeorm";
import { getDataSource } from "../config/datasource";

export abstract class BaseService<T> {
  protected repository: Repository<T>;
  protected dataSource: DataSource;

  constructor(private entity: EntityTarget<T>) {
    this.initializeDataSource();
  }

  protected async ensureInitialized() {
    if (!this.dataSource?.isInitialized) {
      await this.initializeDataSource();
    }
  }

  private async initializeDataSource() {
    if (!this.dataSource) {
      this.dataSource = await getDataSource();
      this.repository = this.dataSource.getRepository(this.entity);
    }
  }

  protected async executeOperation<R>(operation: () => Promise<R>): Promise<R> {
    await this.ensureInitialized();
    return operation();
  }
}
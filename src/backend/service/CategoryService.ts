import { Category, CategoryStatus } from "@backend/entities/Category";
import { DataSource, Repository } from "typeorm";

export class CategoryService {
  private categoryRepository: Repository<Category>;

  constructor(dataSource: DataSource) {
    this.categoryRepository = dataSource.getRepository(Category);
  }

  public async createCategory(name: string): Promise<Category> {
    const category: Category = this.categoryRepository.create({
      name,
      status: CategoryStatus.ACTIVE,
    });
    return await this.categoryRepository.save(category);
  }

  public async fetchCategories(): Promise<Category[]> {
    // Optimized query with proper select and filtering
    return await this.categoryRepository
      .createQueryBuilder("category")
      .where("category.status = :status", { status: CategoryStatus.ACTIVE })
      .select([
        "category.id",
        "category.name",
        "category.status",
        "category.created_at"
      ])
      .orderBy("category.name", "ASC")
      .getMany();
  }

  async deleteCategory(id: number): Promise<void> {
    await this.categoryRepository.update(id, {
      status: CategoryStatus.DELETED,
    });
  }
}

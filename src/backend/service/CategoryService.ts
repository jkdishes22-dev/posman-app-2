import { Category, CategoryStatus } from "@backend/entities/Category";
import { DataSource, Repository } from "typeorm";
import { cache } from "@backend/utils/cache";

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
    const saved = await this.categoryRepository.save(category);

    // Invalidate cache after creating category
    cache.invalidate("categories");

    return saved;
  }

  public async fetchCategories(): Promise<Category[]> {
    const cacheKey = "categories_active";

    // Try cache first
    const cached = cache.get<Category[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Optimized query with proper select and filtering
    const result = await this.categoryRepository
      .createQueryBuilder("category")
      .where("category.status = :status", { status: CategoryStatus.ACTIVE })
      .select([
        "category.id",
        "category.name",
        "category.status",
        "category.created_at",
        "category.updated_at"
      ])
      .orderBy("category.name", "ASC")
      .getMany();

    // Cache the result
    cache.set(cacheKey, result);
    return result;
  }

  async deleteCategory(id: number): Promise<void> {
    await this.categoryRepository.update(id, {
      status: CategoryStatus.DELETED,
    });

    // Invalidate cache after deleting category
    cache.invalidate("categories");
  }
}

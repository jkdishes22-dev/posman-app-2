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

    // Invalidate category cache and any pricelist/station item caches that
    // may include items belonging to the now-deleted category.
    cache.invalidate("categories");
    cache.invalidate("items_pricelist_");
    cache.invalidate("items_station_");
  }
}

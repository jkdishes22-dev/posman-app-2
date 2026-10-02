import { Category, CategoryStatus } from "@backend/entities/Category";
import { Item } from "@backend/entities/Item";
import { DataSource, Repository } from "typeorm";
import { cache } from "@backend/utils/cache";

export class CategoryService {
  private categoryRepository: Repository<Category>;
  private itemRepository: Repository<Item>;

  constructor(dataSource: DataSource) {
    this.categoryRepository = dataSource.getRepository(Category);
    this.itemRepository = dataSource.getRepository(Item);
  }

  public async createCategory(name: string, code?: string): Promise<Category> {
    const category: Category = this.categoryRepository.create({
      name,
      ...(code ? { code } : {}),
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
        "category.code",
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

  async updateCategory(id: number, name: string, code?: string | null): Promise<void> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) throw Object.assign(new Error("Category not found"), { statusCode: 404 });
    await this.categoryRepository.update(id, { name, code: code ?? undefined });
    cache.invalidate("categories");
  }

  async deleteCategory(id: number): Promise<void> {
    // Null out the category FK on all items belonging to this category
    // so items remain accessible (visible on the Items management page).
    await this.itemRepository
      .createQueryBuilder()
      .update(Item)
      .set({ category: null })
      .where("item_category_id = :id", { id })
      .execute();

    await this.categoryRepository.update(id, {
      status: CategoryStatus.DELETED,
    });

    cache.invalidateMany([
      "categories",
      "items_",
      "items_pricelist_",
      "items_station_",
    ]);
  }
}

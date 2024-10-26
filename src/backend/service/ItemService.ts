import { AppDataSource } from "@backend/config/data-source";
import { Category, CategoryStatus } from "@entities/Category";
import { Item } from "@entities/Item";
import { Currency, PricelistItem } from "@entities/PricelistItem";
import { Repository } from "typeorm";

export class ItemService {
  private categoryRepository: Repository<Category>;
  private itemRepository: Repository<Item>;
  private pricelistItemRepository: Repository<PricelistItem>;

  constructor() {
    this.categoryRepository = AppDataSource.getRepository(Category);
    this.itemRepository = AppDataSource.getRepository(Item);
    this.pricelistItemRepository = AppDataSource.getRepository(PricelistItem);
  }
  public async createCategory(name: string): Promise<Category> {
    const category: Category = this.categoryRepository.create({
      name,
      status: CategoryStatus.ACTIVE,
    });
    return this.categoryRepository.save(category);
  }

  public async fetchCategories(): Promise<Category[]> {
    return this.categoryRepository.find();
  }

  public async createItem(
    itemData: Partial<Item>,
    { pricelistId, price },
    user_id: number,
  ): Promise<Item> {
    return await AppDataSource.transaction(
      async (transactionalEntityManager) => {
        const newItem = {
          ...itemData,
          created_by: user_id,
        };
        const item: Item = this.itemRepository.create(newItem);
        const savedItem = await transactionalEntityManager.save(Item, item);

        const newPriceListItem = {
          price: price,
          created_by: user_id,
          pricelist: { id: Number(pricelistId) },
          item: { id: savedItem.id },
          currency: Currency.KES,
        };
        const pricelistItem: PricelistItem =
          this.pricelistItemRepository.create(newPriceListItem);
        await transactionalEntityManager.save(PricelistItem, pricelistItem);

        return savedItem;
      },
    );
  }

  public async fetchItems(categoryId?: string | string[]): Promise<any[]> {
    const query = this.itemRepository
      .createQueryBuilder("item")
      .leftJoinAndSelect("item.category", "category")
      .leftJoin("pricelist_item", "pi", "pi.item_id = item.id")
      .addSelect(["pi.price as price"]);

    if (categoryId) {
      query.where("category.id = :categoryId", { categoryId });
    }

    const items = await query.getRawMany();

    return items.map((item) => ({
      id: item.item_id,
      name: item.item_name,
      code: item.item_code,
      isGroup: item.item_isGroup,
      category: {
        id: item.category_id,
        name: item.category_name,
      },
      price: item.price, // Ensure price is included
    }));
  }

  async deleteCategory(id: number): Promise<void> {
    await this.categoryRepository.update(id, {
      status: CategoryStatus.DELETED,
    });
  }
  async findItemById(id: number): Promise<Item> {
    const item = await this.itemRepository.findOne({ where: { id } });
    if (!item) {
      throw new Error("Item not found");
    }
    return item;
  }

  async updateItem(id: number, updateData: Partial<Item>) {
    const item = await this.findItemById(id);

    Object.assign(item, updateData);
    await this.itemRepository.save(item);
    return item; // Return the updated item
  }
}

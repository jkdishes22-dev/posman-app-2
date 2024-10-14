import { AppDataSource } from "@backend/config/data-source";
import { Category, CategoryStatus } from "@entities/Category";
import { Item } from "@entities/Item";
import { ItemType } from "@entities/ItemType";

export class MenuService {
  private categoryRepository = AppDataSource.getRepository(Category);
  private itemRepository = AppDataSource.getRepository(Item);
  private itemTypeRepository = AppDataSource.getRepository(ItemType);

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

  public async createItem(data: Partial<Item>): Promise<Item> {
    const item: Item = this.itemRepository.create(data);
    return this.itemRepository.save(item);
  }

  public async fetchItems(
    categoryId?: string | string[],
    itemTypeId?: number,
  ): Promise<Item[]> {
    const whereClause: any = {};
    if (categoryId) {
      whereClause.category = { id: categoryId } as any;
    }
    if (itemTypeId) {
      whereClause.itemType = { id: itemTypeId } as any; // Corrected from itemTypeId to itemType
    }
    return this.itemRepository.find({
      where: whereClause,
      relations: ["category", "itemType"],
    });
  }

  public async createItemType(data: Partial<ItemType>): Promise<ItemType> {
    const itemType: ItemType = this.itemRepository.create(data);
    return this.itemTypeRepository.save(itemType);
  }

  public async fetchItemTypes(): Promise<ItemType[]> {
    return this.itemTypeRepository.find();
  }
}

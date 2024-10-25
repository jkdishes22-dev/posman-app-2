import { AppDataSource } from "@backend/config/data-source";
import { Category, CategoryStatus } from "@entities/Category";
import { Item } from "@entities/Item";
import { ItemType } from "@entities/ItemType";

export class ItemService {
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
      whereClause.itemType = { id: itemTypeId } as any;
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

import { AppDataSource } from "@backend/config/data-source";
import { Category, CategoryStatus } from "@entities/Category";
import { Item, ItemStatus } from "@entities/Item";
import { Currency, PricelistItem } from "@entities/PricelistItem";
import { EntityManager, In, Repository } from "typeorm";
import { Pricelist } from "@entities/Pricelist";
import { ItemGroup } from "@entities/ItemGroup";

export class ItemService {
  private categoryRepository: Repository<Category>;
  private itemRepository: Repository<Item>;
  private pricelistItemRepository: Repository<PricelistItem>;
  private pricelistRepository: Repository<Pricelist>;
  private itemGroupRepository: Repository<ItemGroup>;

  constructor() {
    this.categoryRepository = AppDataSource.getRepository(Category);
    this.itemRepository = AppDataSource.getRepository(Item);
    this.pricelistItemRepository = AppDataSource.getRepository(PricelistItem);
    this.pricelistRepository = AppDataSource.getRepository(Pricelist);
    this.itemGroupRepository = AppDataSource.getRepository(ItemGroup);
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
          status: ItemStatus.ACTIVE,
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
      .leftJoin("pi.pricelist", "pricelist") // Join pricelist table
      .addSelect([
        "pi.price AS price",
        "pi.is_enabled AS pricelist_item_isEnabled",
        "pi.id AS pricelistId",
        "pricelist.name AS pricelistName",
      ]); // Select pricelist name

    query.andWhere("pi.is_enabled = :enabled", { enabled: 1 });

    if (categoryId) {
      query.andWhere("category.id = :categoryId", { categoryId });
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
      price: item.price,
      pricelistId: item.pricelistId,
      pricelistName: item.pricelistName, // Include pricelist name in response
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

  public async updateItem(
    itemData: Partial<Item>,
    { pricelistItemId, price },
    user_id: number,
    pricelistId: number,
  ): Promise<Item> {
    return await AppDataSource.transaction(
      async (transactionalEntityManager) => {
        const itemToUpdate = await this.itemRepository.findOne({
          where: { id: itemData.id },
        });

        if (!itemToUpdate) {
          throw new Error("Item not found");
        }

        const updatedItemData = {
          ...itemToUpdate,
          ...itemData,
          updated_by: user_id,
        };

        await transactionalEntityManager.save(Item, updatedItemData);

        const pricelistItemToUpdate = await this.pricelistItemRepository
          .createQueryBuilder("pi")
          .innerJoinAndSelect("pi.item", "item")
          .innerJoinAndSelect("pi.pricelist", "pricelist")
          .where("pi.id = :pricelistItemId", {
            pricelistItemId: Number(pricelistItemId),
          })
          .getOne();

        console.log(
          "pricelistItemToUpdate " + JSON.stringify(pricelistItemToUpdate),
        );

        if (pricelistItemToUpdate) {
          await this.disablePreExistingPricelistItems(
            transactionalEntityManager,
            pricelistItemToUpdate,
          );

          pricelistItemToUpdate.price = price;
          pricelistItemToUpdate.updated_by = user_id;
          await transactionalEntityManager.save(
            PricelistItem,
            pricelistItemToUpdate,
          );
        } else {
          await this.createNewPricelistItem(
            price,
            user_id,
            pricelistId,
            itemData,
            transactionalEntityManager,
          );
        }

        console.log("updatedItemData " + JSON.stringify(updatedItemData));
        return updatedItemData;
      },
    );
  }

  private async createNewPricelistItem(
    price,
    user_id: number,
    pricelistId,
    itemData: Partial<Item>,
    transactionalEntityManager: EntityManager,
  ) {
    const newPriceListItem = {
      price,
      created_by: user_id,
      pricelist: { id: Number(pricelistId) },
      item: { id: itemData.id },
      currency: Currency.KES,
      is_enabled: true,
    };
    console.log("new PriceList Item " + JSON.stringify(newPriceListItem));
    const pricelistItem: PricelistItem =
      this.pricelistItemRepository.create(newPriceListItem);
    await transactionalEntityManager.save(PricelistItem, pricelistItem);
  }

  private async disablePreExistingPricelistItems(
    transactionalEntityManager: EntityManager,
    pricelistItem: PricelistItem | null,
  ) {
    await transactionalEntityManager
      .createQueryBuilder()
      .update(PricelistItem)
      .set({ is_enabled: false })
      .where("item_id = :itemId", { itemId: pricelistItem?.item.id })
      .andWhere("pricelist_id = :pricelistId", {
        pricelistId: pricelistItem?.pricelist.id,
      })
      .execute();
  }

  async fetchGroupedItems() {
    const groupsWithItems = await this.itemRepository
      .createQueryBuilder("group")
      .leftJoinAndSelect("group.subItems", "subItem")
      .where("group.isGroup = :isGroup", { isGroup: true })
      .select([
        "group.id", // Item group ID
        "group.name", // Item group name
        "subItem.id", // Sub-item ID
        "subItem.name", // Sub-item name
      ])
      .getMany();

    return groupsWithItems.map((group) => ({
      id: group.id,
      name: group.name,
      items: group.subItems.map((subItem) => ({
        id: subItem.id,
        name: subItem.name,
      })),
    }));
  }

  async createGroupedItem(
    itemId: number,
    subItemId: number,
    // portionSize: number,
  ) {
    try {
      const items = await this.itemRepository.find({
        where: { id: In([itemId, subItemId]) },
      });

      if (items.length !== 2) {
        throw new Error("Item or SubItem not found.");
      }

      const item = items.find((i) => i.id === itemId);
      const subItem = items.find((i) => i.id === subItemId);

      if (!item || !subItem) {
        throw new Error("Item or SubItem not found.");
      }

      if (!item.isGroup) {
        throw new Error(
          "The selected item is not a valid group (is_group should be true).",
        );
      }

      const newItemGroup = new ItemGroup();
      newItemGroup.item = item;
      newItemGroup.subItem = subItem;
      // newItemGroup.portionSize = portionSize;

      await this.itemGroupRepository.save(newItemGroup);

      console.log("Group item added successfully.");
      return newItemGroup;
    } catch (error) {
      console.error("Error adding group item:", error);
      throw error;
    }
  }
}

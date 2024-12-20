import { AppDataSource } from "@backend/config/data-source";
import { Category } from "@entities/Category";
import { Item, ItemStatus } from "@entities/Item";
import { Currency, PricelistItem } from "@entities/PricelistItem";
import { EntityManager, In, Like, Repository } from "typeorm";
import { ItemGroup } from "@entities/ItemGroup";

export class ItemService {
  private itemRepository: Repository<Item>;
  private pricelistItemRepository: Repository<PricelistItem>;
  private itemGroupRepository: Repository<ItemGroup>;

  constructor() {
    this.itemRepository = AppDataSource.getRepository(Item);
    this.pricelistItemRepository = AppDataSource.getRepository(PricelistItem);
    this.itemGroupRepository = AppDataSource.getRepository(ItemGroup);
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

  public async fetchItems(categoryId: number, user_id: number, billing: boolean = false): Promise<any[]> {
    const query = this.itemRepository
      .createQueryBuilder("item")
      .leftJoinAndSelect("item.category", "category")
      .leftJoin("pricelist_item", "pi", "pi.item_id = item.id")
      .leftJoin("pi.pricelist", "pricelist")
      .leftJoin("station", "s", "s.id = pricelist.station_id")
      .leftJoin("user_station", "us", "us.station_id = s.id")
      .leftJoin("user", "u", "u.id = us.user_id")
      .addSelect([
        "pi.price AS price",
        "pi.is_enabled AS pricelist_item_isEnabled",
        "pi.id AS pricelistId",
        "pricelist.name AS pricelistName",
        "s.name as stationName"
      ]);

    if (billing) {
      query.andWhere("pi.is_enabled = :enabled", { enabled: 1 });
      query.andWhere("us.status = :status", { status: 'enabled' })
      query.andWhere("us.is_default = :is_default", { is_default: 1 })
      query.andWhere("u.id = :id", { id: user_id })
    }

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
      pricelistName: item.pricelistName,
    }));
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
        return updatedItemData;
      },
    );
  }

  private async createNewPricelistItem(
    price: any,
    user_id: number,
    pricelistId: number,
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

  async fetchGroupedItems(groupId?: number) {
    const queryBuilder = this.itemRepository
      .createQueryBuilder("group")
      .leftJoinAndSelect("group.subItems", "subItem")
      .leftJoin("item_group", "groupSubItem", "groupSubItem.item_id = group.id AND groupSubItem.sub_item_id = subItem.id")
      .where("group.isGroup = :isGroup", { isGroup: true });

    if (groupId) {
      queryBuilder.andWhere("group.id = :groupId", { groupId });
    }

    const rawResults = await queryBuilder
      .select([
        "group.id AS group_id",
        "group.name AS group_name",
        "subItem.id AS subItem_id",
        "subItem.name AS subItem_name",
        "groupSubItem.portion_size AS portion_size"
      ])
      .getRawMany();

    const groupsWithItems = rawResults.reduce((acc, row) => {
      let group = acc.find(g => g.id === row.group_id);
      if (!group) {
        group = {
          id: row.group_id,
          name: row.group_name,
          items: []
        };
        acc.push(group);
      }
      group.items.push({
        id: row.subItem_id,
        name: row.subItem_name,
        portionSize: row.portion_size
      });
      return acc;
    }, []);

    return groupsWithItems;
  }

  async createGroupedItem(
    groupItemRequest: { itemId: any; subItemId: any; portionSize: any; }
  ) {
    try {
      const { itemId, subItemId, portionSize } = groupItemRequest;
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
      newItemGroup.portion_size = portionSize;

      await this.itemGroupRepository.save(newItemGroup);

      return newItemGroup;
    } catch (error) {
      console.error("Error adding group item:", error);
      throw error;
    }
  };

  async filterItems(criteria: Record<string, any>) {
    const queryBuilder = this.itemRepository.
      createQueryBuilder("item").
      where("item.name LIKE :search", { search: `%${criteria.search}%` });
    if (criteria.excludeGrouped) {
      queryBuilder.andWhere("item.is_group = :isGroup", { isGroup: false });
    }
    return await queryBuilder.getMany();
  }


  async fetchGroupItems(groupId: number) {

  }

  async removeItemFromGroup(groupId: number, itemId: number) {
    await this.itemGroupRepository.delete(
      {
        item: { id: parseInt(groupId) },
        subItem: { id: parseInt(itemId) },
      });
  };
};
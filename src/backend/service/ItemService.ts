import { Item, ItemStatus } from "@entities/Item";
import { Currency, PricelistItem } from "@entities/PricelistItem";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { ItemGroup } from "@entities/ItemGroup";
import logger from "../utils/logger";

export class ItemService {
  private itemRepository: Repository<Item>;
  private pricelistItemRepository: Repository<PricelistItem>;
  private itemGroupRepository: Repository<ItemGroup>;

  constructor(datasource: DataSource) {
    this.itemRepository = datasource.getRepository(Item);
    this.pricelistItemRepository = datasource.getRepository(PricelistItem);
    this.itemGroupRepository = datasource.getRepository(ItemGroup);
  }

  public async createItem(
    itemData: Partial<Item>,
    { pricelistId, price },
    user_id: number,
  ): Promise<Item> {
    return await this.itemRepository.manager.connection.transaction(
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

  public async fetchItems(
    categoryId: number,
    user_id: number,
    billing: boolean = false,
  ): Promise<any[]> {
    const query = this.itemRepository
      .createQueryBuilder("item")
      .leftJoinAndSelect("item.category", "category")
      .leftJoin("pricelist_item", "pi", "pi.item_id = item.id")
      .leftJoin("pi.pricelist", "pricelist")
      .leftJoin("station_pricelist", "sp", "sp.pricelist_id = pricelist.id")
      .leftJoin("station", "s", "s.id = sp.station_id")
      .leftJoin("user_station", "us", "us.station_id = s.id")
      .leftJoin("user", "u", "u.id = us.user_id")
      .addSelect([
        "pi.price AS price",
        "pi.is_enabled AS pricelist_item_isEnabled",
        "pi.id AS pricelistId",
        "pricelist.name AS pricelistName",
        "s.name as stationName",
      ]);

    if (billing) {
      query.andWhere("pi.is_enabled = :enabled", { enabled: 1 });
      query.andWhere("us.status = :status", { status: "active" });
      query.andWhere("us.is_default = :is_default", { is_default: 1 });
      query.andWhere("u.id = :id", { id: user_id });
    }

    if (categoryId) {
      query.andWhere("category.id = :categoryId", { categoryId });
    }

    const items = await query.getRawMany();

    return items.map((item) => ({
      id: item.item_id,
      name: item.item_name,
      code: item.item_code,
      isGroup: Boolean(item.item_isGroup),
      category: {
        id: item.category_id,
        name: item.category_name,
      },
      price: item.price,
      pricelistId: item.pricelistId,
      pricelistName: item.pricelistName,
    }));
  }

  /**
   * Fetch items for a specific station using the station's default pricelist
   */
  public async fetchItemsForStation(
    stationId: number,
    categoryId?: number,
    userId?: number
  ): Promise<any[]> {
    // First, get the default pricelist for this station using junction table
    const stationPricelistRepository = this.itemRepository.manager.getRepository("StationPricelist");
    const defaultPricelist = await stationPricelistRepository
      .createQueryBuilder("sp")
      .leftJoinAndSelect("sp.pricelist", "pricelist")
      .where("sp.station_id = :stationId", { stationId })
      .andWhere("sp.is_default = :isDefault", { isDefault: true })
      .andWhere("sp.status = :status", { status: "active" })
      .getOne();

    if (!defaultPricelist) {
      logger.debug({ stationId }, 'No default pricelist found for station');
      return [];
    }

    // Get pricelist items for the default pricelist
    const pricelistQuery = this.pricelistItemRepository
      .createQueryBuilder("pi")
      .leftJoinAndSelect("pi.pricelist", "pricelist")
      .leftJoinAndSelect("pi.item", "item")
      .where("pricelist.id = :pricelistId", { pricelistId: defaultPricelist.pricelist.id })
      .andWhere("pi.is_enabled = :enabled", { enabled: 1 });

    if (categoryId) {
      pricelistQuery.andWhere("item.item_category_id = :categoryId", { categoryId });
    }

    const pricelistItems = await pricelistQuery.getMany();

    if (pricelistItems.length === 0) {
      logger.debug({ stationId, pricelistId: defaultPricelist.pricelist.id }, 'No pricelist items found for station');
      return [];
    }

    logger.debug({ stationId, itemCount: pricelistItems.length }, 'Found pricelist items for station');


    // Extract item IDs from pricelist items
    const itemIds = pricelistItems.map(pi => {
      if (!pi.item) {
        console.error('Pricelist item missing item data:', pi);
        return null;
      }
      return pi.item.id;
    }).filter(id => id !== null);

    // Now fetch items with their details
    const query = this.itemRepository
      .createQueryBuilder("item")
      .leftJoinAndSelect("item.category", "category")
      .where("item.id IN (:...itemIds)", { itemIds })
      .orderBy("item.name", "ASC");

    if (categoryId) {
      query.andWhere("category.id = :categoryId", { categoryId });
    }

    const items = await query.getMany();

    // If userId is provided, validate user has access to this station
    if (userId) {
      const userStationQuery = this.itemRepository.manager
        .createQueryBuilder()
        .select("us.user_id")
        .from("user_station", "us")
        .where("us.station_id = :stationId", { stationId })
        .andWhere("us.user_id = :userId", { userId })
        .andWhere("us.status = :userStatus", { userStatus: "active" });

      const userAccess = await userStationQuery.getRawOne();
      if (!userAccess) {
        return []; // User doesn't have access to this station
      }
    }

    // Map items with their pricelist data
    return items.map(item => {
      const pricelistItem = pricelistItems.find(pi => pi.item.id === item.id);
      return {
        id: item.id,
        name: item.name,
        code: item.code,
        status: item.status,
        default_unit_id: item.defaultUnitId,
        is_group: item.isGroup,
        is_stock: item.isStock,
        item_category_id: item.category.id,
        category: {
          id: item.category.id,
          name: item.category.name,
          status: item.category.status
        },
        price: pricelistItem?.price || 0,
        pricelist_item_isEnabled: pricelistItem?.is_enabled || false,
        pricelistId: pricelistItem?.id || null,
        pricelistName: pricelistItem?.pricelist?.name || null,
        pricelist_is_default: pricelistItem?.pricelist?.is_default || false,
        stationId: stationId
      };
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
    return await this.itemRepository.manager.connection.transaction(
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
      .leftJoin(
        "item_group",
        "groupSubItem",
        "groupSubItem.item_id = group.id AND groupSubItem.sub_item_id = subItem.id",
      )
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
        "groupSubItem.portion_size AS portion_size",
      ])
      .getRawMany();

    const groupsWithItems = rawResults.reduce((acc, row) => {
      let group = acc.find((g) => g.id === row.group_id);
      if (!group) {
        group = {
          id: row.group_id,
          name: row.group_name,
          items: [],
        };
        acc.push(group);
      }
      group.items.push({
        id: row.subItem_id,
        name: row.subItem_name,
        portionSize: row.portion_size,
      });
      return acc;
    }, []);

    return groupsWithItems;
  }

  async createGroupedItem(groupItemRequest: {
    itemId: any;
    subItemId: any;
    portionSize: any;
  }) {
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
    } catch (error: any) {
      console.error("Error adding group item:", error);
      throw error;
    }
  }

  async filterItems(criteria: Record<string, any>) {
    const queryBuilder = this.itemRepository
      .createQueryBuilder("item")
      .where("item.name LIKE :search", { search: `%${criteria.search}%` });
    if (criteria.excludeGrouped) {
      queryBuilder.andWhere("item.is_group = :isGroup", { isGroup: false });
    }
    return await queryBuilder.getMany();
  }

  async removeItemFromGroup(groupId: number, itemId: number) {
    await this.itemGroupRepository.delete({
      item: { id: groupId },
      subItem: { id: itemId },
    });
  }

  async getSubItemsForPlatter(platterId: number): Promise<any> {
    try {
      // First, check if the item exists and is a group
      const platter = await this.itemRepository.findOne({
        where: { id: platterId },
        relations: ["category"]
      });

      if (!platter) {
        throw new Error("Platter not found");
      }

      if (!platter.isGroup) {
        throw new Error("Item is not a platter/group");
      }

      // Get sub-items with portion sizes
      const subItems = await this.itemGroupRepository.find({
        where: { item: { id: platterId } },
        relations: ["subItem", "subItem.category"],
        order: { subItem: { name: "ASC" } }
      });

      // Format the response
      const formattedSubItems = subItems.map(itemGroup => ({
        id: itemGroup.subItem.id,
        name: itemGroup.subItem.name,
        code: itemGroup.subItem.code,
        category: itemGroup.subItem.category?.name || "N/A",
        portionSize: itemGroup.portion_size,
        unit: "servings"
      }));

      return {
        platter: {
          id: platter.id,
          name: platter.name,
          code: platter.code,
          category: platter.category?.name || "N/A"
        },
        subItems: formattedSubItems,
        totalSubItems: formattedSubItems.length
      };
    } catch (error: any) {
      throw new Error("Failed to fetch sub-items: " + error.message);
    }
  }

  /**
   * Search items by name across all pricelists
   * Returns items with their pricelist information
   */
  public async searchItemsByName(query: string, limit: number = 10): Promise<any[]> {
    try {
      const items = await this.itemRepository
        .createQueryBuilder("item")
        .leftJoinAndSelect("item.category", "category")
        .leftJoin("pricelist_item", "pricelistItem", "pricelistItem.item_id = item.id")
        .leftJoin("pricelist", "pricelist", "pricelist.id = pricelistItem.pricelist_id")
        .where("item.name LIKE :query", { query: `%${query}%` })
        .andWhere("(item.status = :status OR item.status IS NULL)", { status: ItemStatus.ACTIVE })
        .andWhere("pricelist.status = :pricelistStatus", { pricelistStatus: "active" })
        .orderBy("item.name", "ASC")
        .limit(limit)
        .getMany();

      // Get pricelist information for each item
      const formattedResults = await Promise.all(items.map(async (item) => {
        const pricelistItems = await this.pricelistItemRepository
          .createQueryBuilder("pricelistItem")
          .leftJoinAndSelect("pricelistItem.pricelist", "pricelist")
          .where("pricelistItem.item_id = :itemId", { itemId: item.id })
          .andWhere("pricelist.status = :pricelistStatus", { pricelistStatus: "active" })
          .getMany();

        const pricelists = pricelistItems.map(pi => ({
          pricelistId: pi.pricelist?.id,
          pricelistName: pi.pricelist?.name,
          price: pi.price || 0,
          currency: pi.currency || "USD",
          isDefault: pi.pricelist?.is_default || false
        }));

        return {
          id: item.id,
          name: item.name,
          code: item.code,
          category: item.category?.name || "N/A",
          pricelists: pricelists,
          totalPricelists: pricelists.length
        };
      }));

      logger.info({
        query,
        limit,
        foundItems: formattedResults.length
      }, 'Items searched successfully');

      return formattedResults;
    } catch (error: any) {
      logger.error({ error: error.message, query }, 'Failed to search items');
      throw new Error("Failed to search items: " + error.message);
    }
  }
}

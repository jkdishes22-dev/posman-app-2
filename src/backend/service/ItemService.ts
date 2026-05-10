import { Item, ItemStatus } from "@entities/Item";
import { CategoryStatus } from "@entities/Category";
import { Currency, PricelistItem } from "@entities/PricelistItem";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { ItemGroup } from "@entities/ItemGroup";
import { Inventory } from "@entities/Inventory";
import logger from "../utils/logger";
import { cache } from "@backend/utils/cache";
import { AuditService } from "./AuditService";

export class ItemService {
  private itemRepository: Repository<Item>;
  private pricelistItemRepository: Repository<PricelistItem>;
  private itemGroupRepository: Repository<ItemGroup>;
  private auditService: AuditService;

  constructor(datasource: DataSource) {
    this.itemRepository = datasource.getRepository(Item);
    this.pricelistItemRepository = datasource.getRepository(PricelistItem);
    this.itemGroupRepository = datasource.getRepository(ItemGroup);
    this.auditService = new AuditService(datasource);
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

        // Invalidate cache after creating item (affects items and prices)
        cache.invalidateMany(["items", `pricelist_items_${pricelistId}`]);

        return savedItem;
      },
    );
  }

  public async fetchItems(
    categoryId: number,
    user_id: number,
    billing: boolean = false,
  ): Promise<any[]> {
    // Cache key includes all parameters (prices can change, but cache for performance)
    const cacheKey = `items_${categoryId}_${user_id}_${billing}`;

    // Try cache first
    const cached = cache.get<any[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

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
        "pi.id AS pricelistItemId",
        "pricelist.id AS pricelistId",
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

    const toBoolean = (value: any): boolean =>
      value === true ||
      value === 1 ||
      value === "1" ||
      value === "true" ||
      value === "TRUE";

    const result = items.map((item) => ({
      id: item.item_id,
      name: item.item_name,
      code: item.item_code,
      // Raw alias names can vary by driver/build mode; normalize all known keys.
      isGroup: toBoolean(item.item_isGroup ?? item.item_is_group ?? item.is_group),
      isStock: toBoolean(item.item_isStock ?? item.item_is_stock ?? item.is_stock),
      allowNegativeInventory: toBoolean(
        item.item_allowNegativeInventory ??
        item.item_allow_negative_inventory ??
        item.allow_negative_inventory
      ),
      category: {
        id: item.category_id,
        name: item.category_name,
      },
      price: item.price,
      pricelistItemId: item.pricelistItemId,
      pricelistId: item.pricelistId,
      pricelistName: item.pricelistName,
    }));

    // Cache the result (prices can change, but cache for performance with 30s TTL)
    cache.set(cacheKey, result);
    return result;
  }

  /**
   * Distinct active, non-group catalog items for inventory transaction filters.
   * Uses the item table only (no pricelist/station joins) so each line appears once and
   * items with no inventory row are still listed.
   */
  public async fetchNonGroupActiveItemsForSelect(): Promise<{ id: number; name: string; code: string }[]> {
    const rows = await this.itemRepository
      .createQueryBuilder("item")
      .select(["item.id", "item.name", "item.code"])
      .where("item.status = :status", { status: ItemStatus.ACTIVE })
      .andWhere("(item.isGroup = :notGroup OR item.isGroup IS NULL)", { notGroup: false })
      .orderBy("item.name", "ASC")
      .addOrderBy("item.code", "ASC")
      .getMany();
    return rows.map((i) => ({ id: i.id, name: i.name, code: i.code }));
  }

  /**
   * Fetch items for a specific pricelist
   */
  public async fetchItemsForPricelist(
    pricelistId: number,
    categoryId?: number
  ): Promise<any[]> {
    const cacheKey = `items_pricelist_${pricelistId}_${categoryId || "all"}`;

    // Try cache first (prices can change, but cache for performance)
    const cached = cache.get<any[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Get pricelist items for the specified pricelist
    const pricelistQuery = this.pricelistItemRepository
      .createQueryBuilder("pi")
      .leftJoinAndSelect("pi.pricelist", "pricelist")
      .leftJoinAndSelect("pi.item", "item")
      .leftJoinAndSelect("item.category", "category")
      .where("pricelist.id = :pricelistId", { pricelistId })
      .andWhere("pi.is_enabled = :enabled", { enabled: 1 })
      .andWhere("item.status = :itemStatus", { itemStatus: ItemStatus.ACTIVE })
      .andWhere(
        "(category.id IS NULL OR category.status != :catDeleted)",
        { catDeleted: CategoryStatus.DELETED }
      );

    if (categoryId) {
      pricelistQuery.andWhere("item.item_category_id = :categoryId", { categoryId });
    }

    const pricelistItems = await pricelistQuery.getMany();

    if (pricelistItems.length === 0) {
      logger.debug({ pricelistId }, "No pricelist items found for pricelist");
      return [];
    }

    logger.debug({ pricelistId, itemCount: pricelistItems.length }, "Found pricelist items for pricelist");

    // Map pricelist items to the expected format
    const result = pricelistItems.map(pi => ({
      id: pi.item.id,
      name: pi.item.name,
      code: pi.item.code,
      isGroup: Boolean(pi.item.isGroup),
      isStock: Boolean(pi.item.isStock),
      allowNegativeInventory: Boolean(pi.item.allowNegativeInventory),
      category: {
        id: pi.item.category?.id,
        name: pi.item.category?.name,
      },
      price: pi.price,
      pricelistItemId: pi.id,
      pricelistId: pi.pricelist.id,
      pricelistName: pi.pricelist.name,
    }));

    // Cache the result (prices can change, but cache for performance)
    cache.set(cacheKey, result);
    return result;
  }

  /**
   * Fetch items for a specific station using the station's default pricelist
   */
  public async fetchItemsForStation(
    stationId: number,
    categoryId?: number,
    userId?: number
  ): Promise<any[]> {
    const cacheKey = `items_station_${stationId}_${categoryId || "all"}_${userId || "all"}`;

    // Try cache first (prices can change, but cache for performance)
    const cached = cache.get<any[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

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
      logger.debug({ stationId }, "No default pricelist found for station");
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
      logger.debug({ stationId, pricelistId: defaultPricelist.pricelist.id }, "No pricelist items found for station");
      return [];
    }

    logger.debug({ stationId, itemCount: pricelistItems.length }, "Found pricelist items for station");


    // Extract item IDs from pricelist items
    const itemIds = pricelistItems.map(pi => {
      if (!pi.item) {
        console.error("Pricelist item missing item data:", pi);
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
    const result = items.map(item => {
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

    // Cache the result (prices can change, but cache for performance)
    cache.set(cacheKey, result);
    return result;
  }

  async findItemById(id: number): Promise<Item> {
    const cacheKey = `item_${id}`;

    // Try cache first
    const cached = cache.get<Item | null>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const item = await this.itemRepository.findOne({ where: { id } });
    if (!item) {
      throw new Error("Item not found");
    }

    // Cache the result
    cache.set(cacheKey, item);
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

        // Track changes for audit logging
        const fieldsToTrack = ["category", "isStock", "allowNegativeInventory", "name", "code"];
        for (const field of fieldsToTrack) {
          if (itemData[field] !== undefined && itemToUpdate[field] !== itemData[field]) {
            const oldValue = itemToUpdate[field];
            const newValue = itemData[field];

            // For category, we need to get the ID
            if (field === "category") {
              const oldCategoryId = oldValue?.id || oldValue;
              const newCategoryId = newValue?.id || newValue;
              if (oldCategoryId !== newCategoryId) {
                await this.auditService.logItemChange(
                  itemToUpdate.id,
                  "category",
                  oldCategoryId,
                  newCategoryId,
                  user_id
                );
              }
            } else {
              await this.auditService.logItemChange(
                itemToUpdate.id,
                field,
                oldValue,
                newValue,
                user_id
              );
            }
          }
        }

        const updatedItemData = {
          ...itemToUpdate,
          ...itemData,
          updated_by: user_id,
        };

        await transactionalEntityManager.save(Item, updatedItemData);

        // Create inventory record when item is marked as stock item (isStock: true)
        // Stock items are purchased/supplied items that need inventory tracking
        // Note: Sellable items (isStock: false) get inventory records automatically when production is issued
        if (itemData.isStock === true && itemToUpdate.isStock !== true) {
          const inventoryRepository = transactionalEntityManager.getRepository(Inventory);
          const existingInventory = await inventoryRepository.findOne({
            where: { item_id: itemData.id },
          });

          if (!existingInventory) {
            const newInventory = inventoryRepository.create({
              item_id: itemData.id,
              quantity: 0,
              created_by: user_id,
            });
            await inventoryRepository.save(newInventory);
          }
        }

        // Only query for pricelistItem if pricelistItemId is provided and valid
        let pricelistItemToUpdate = null;
        if (pricelistItemId !== null && pricelistItemId !== undefined && !isNaN(Number(pricelistItemId)) && Number(pricelistItemId) > 0) {
          pricelistItemToUpdate = await this.pricelistItemRepository
            .createQueryBuilder("pi")
            .innerJoinAndSelect("pi.item", "item")
            .innerJoinAndSelect("pi.pricelist", "pricelist")
            .where("pi.id = :pricelistItemId", {
              pricelistItemId: Number(pricelistItemId),
            })
            .getOne();
        }

        if (pricelistItemToUpdate) {
          await this.disablePreExistingPricelistItems(
            transactionalEntityManager,
            pricelistItemToUpdate,
          );

          // Log price change if it changed
          const oldPrice = pricelistItemToUpdate.price;
          if (oldPrice !== price) {
            await this.auditService.logPricelistItemChange(
              pricelistItemToUpdate.id,
              "price",
              oldPrice,
              price,
              user_id
            );
          }

          pricelistItemToUpdate.price = price;
          pricelistItemToUpdate.updated_by = user_id;
          await transactionalEntityManager.save(
            PricelistItem,
            pricelistItemToUpdate,
          );
        } else {
          await transactionalEntityManager
            .createQueryBuilder()
            .update(PricelistItem)
            .set({ is_enabled: false })
            .where("item_id = :itemId", { itemId: itemData.id })
            .andWhere("pricelist_id = :pricelistId", { pricelistId })
            .execute();
          await this.createNewPricelistItem(
            price,
            user_id,
            pricelistId,
            itemData,
            transactionalEntityManager,
          );
        }

        // Invalidate cache after updating item (affects items and prices)
        cache.invalidateMany([
          "items",
          `item_${itemData.id}`,
          `pricelist_items_${pricelistId}`,
          "items_pricelist",
          "items_station",
        ]);

        // Reload the item to ensure all fields are properly set and relations are loaded
        const savedItem = await transactionalEntityManager.findOne(Item, {
          where: { id: itemData.id },
          relations: ["category"],
        });

        return savedItem || updatedItemData;
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

  async fetchGroupedItems(groupId?: number, page: number = 1, limit: number = 10) {
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

    // If no specific groupId, add pagination
    if (!groupId) {
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);
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
      if (row.subItem_id) {
        group.items.push({
          id: row.subItem_id,
          name: row.subItem_name,
          portionSize: row.portion_size,
        });
      }
      return acc;
    }, []);

    // If no specific groupId, add pagination metadata
    if (!groupId) {
      const totalGroups = await this.itemRepository.count({
        where: { isGroup: true }
      });
      const totalPages = Math.ceil(totalGroups / limit);

      return {
        groups: groupsWithItems,
        pagination: {
          currentPage: page,
          totalPages,
          totalGroups,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          limit
        }
      };
    }

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

      if (item.id === subItem.id) {
        throw new Error("A composite item cannot include itself as an ingredient.");
      }

      if (!item.isGroup) {
        throw new Error(
          "The selected item is not a valid group (is_group should be true).",
        );
      }

      if (subItem.isGroup) {
        throw new Error("Group/composite items cannot be used as ingredients.");
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

  async updatePortionSize(groupId: number, subItemId: number, portionSize: number) {
    const itemGroup = await this.itemGroupRepository.findOne({
      where: {
        item: { id: groupId },
        subItem: { id: subItemId },
      },
    });

    if (!itemGroup) {
      throw new Error("Item group relationship not found");
    }

    itemGroup.portion_size = Number(portionSize);
    await this.itemGroupRepository.save(itemGroup);
    return itemGroup;
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
      // perf: single JOIN query replaces N+1 pattern (1 query instead of 1 + N)
      const rows = await this.itemRepository
        .createQueryBuilder("item")
        .leftJoinAndSelect("item.category", "category")
        .leftJoin("pricelist_item", "pricelistItem", "pricelistItem.item_id = item.id")
        .leftJoin("pricelist", "pricelist", "pricelist.id = pricelistItem.pricelist_id AND pricelist.status = :pricelistStatus", { pricelistStatus: "active" })
        .select([
          "item.id", "item.name", "item.code",
          "category.name",
          "pricelistItem.price", "pricelistItem.currency",
          "pricelist.id", "pricelist.name", "pricelist.is_default",
        ])
        .where("item.name LIKE :query", { query: `%${query}%` })
        .andWhere("(item.status = :status OR item.status IS NULL)", { status: ItemStatus.ACTIVE })
        .andWhere("pricelist.id IS NOT NULL")
        .orderBy("item.name", "ASC")
        .limit(limit)
        .getRawMany();

      // Group raw rows by item id
      const itemMap = new Map<number, any>();
      for (const row of rows) {
        if (!itemMap.has(row.item_id)) {
          itemMap.set(row.item_id, {
            id: row.item_id,
            name: row.item_name,
            code: row.item_code,
            category: row.category_name || "N/A",
            pricelists: [],
          });
        }
        if (row.pricelist_id) {
          itemMap.get(row.item_id).pricelists.push({
            pricelistId: row.pricelist_id,
            pricelistName: row.pricelist_name,
            price: row.pricelistItem_price || 0,
            currency: row.pricelistItem_currency || "USD",
            isDefault: row.pricelist_is_default || false,
          });
        }
      }

      const formattedResults = Array.from(itemMap.values()).map(item => ({
        ...item,
        totalPricelists: item.pricelists.length,
      }));

      logger.info({
        query,
        limit,
        foundItems: formattedResults.length
      }, "Items searched successfully");

      return formattedResults;
    } catch (error: any) {
      logger.error({ error: error.message, query }, "Failed to search items");
      throw new Error("Failed to search items: " + error.message);
    }
  }

  public async searchItemsByNameForUser(query: string, userId: number, limit: number = 10): Promise<any[]> {
    try {
      // Get user's accessible stations
      const userStationRepository = this.itemRepository.manager.getRepository("UserStation");
      const userStations = await userStationRepository
        .createQueryBuilder("us")
        .leftJoinAndSelect("us.station", "station")
        .where("us.user_id = :userId", { userId })
        .andWhere("us.status = :status", { status: "active" })
        .getMany();

      if (userStations.length === 0) {
        logger.info({ userId }, "User has no accessible stations");
        return [];
      }

      const stationIds = userStations.map(us => us.station.id);

      // Get pricelists accessible to user's stations
      const stationPricelistRepository = this.itemRepository.manager.getRepository("StationPricelist");
      const accessiblePricelists = await stationPricelistRepository
        .createQueryBuilder("sp")
        .leftJoinAndSelect("sp.pricelist", "pricelist")
        .where("sp.station_id IN (:...stationIds)", { stationIds })
        .andWhere("sp.status = :status", { status: "active" })
        .andWhere("pricelist.status = :pricelistStatus", { pricelistStatus: "active" })
        .getMany();

      if (accessiblePricelists.length === 0) {
        logger.info({ userId, stationIds }, "No accessible pricelists found for user stations");
        return [];
      }

      const pricelistIds = accessiblePricelists.map(sp => sp.pricelist.id);

      // perf: single JOIN query replaces N+1 pattern (1 query instead of 1 + N)
      const rows = await this.itemRepository
        .createQueryBuilder("item")
        .leftJoinAndSelect("item.category", "category")
        .leftJoin("pricelist_item", "pricelistItem", "pricelistItem.item_id = item.id AND pricelistItem.pricelist_id IN (:...pricelistIds)", { pricelistIds })
        .leftJoin("pricelist", "pricelist", "pricelist.id = pricelistItem.pricelist_id AND pricelist.status = :pricelistStatus", { pricelistStatus: "active" })
        .select([
          "item.id", "item.name", "item.code",
          "category.name",
          "pricelistItem.price", "pricelistItem.currency",
          "pricelist.id", "pricelist.name", "pricelist.is_default",
        ])
        .where("item.name LIKE :query", { query: `%${query}%` })
        .andWhere("(item.status = :status OR item.status IS NULL)", { status: ItemStatus.ACTIVE })
        .andWhere("pricelistItem.pricelist_id IN (:...pricelistIds)", { pricelistIds })
        .orderBy("item.name", "ASC")
        .limit(limit)
        .getRawMany();

      // Group raw rows by item id
      const itemMap = new Map<number, any>();
      for (const row of rows) {
        if (!itemMap.has(row.item_id)) {
          itemMap.set(row.item_id, {
            id: row.item_id,
            name: row.item_name,
            code: row.item_code,
            category: row.category_name || "N/A",
            pricelists: [],
          });
        }
        if (row.pricelist_id) {
          itemMap.get(row.item_id).pricelists.push({
            pricelistId: row.pricelist_id,
            pricelistName: row.pricelist_name,
            price: row.pricelistItem_price || 0,
            currency: row.pricelistItem_currency || "USD",
            isDefault: row.pricelist_is_default || false,
          });
        }
      }

      const formattedResults = Array.from(itemMap.values()).map(item => ({
        ...item,
        totalPricelists: item.pricelists.length,
      }));

      logger.info({
        query,
        userId,
        limit,
        foundItems: formattedResults.length,
        accessibleStations: stationIds.length,
        accessiblePricelists: pricelistIds.length
      }, "Items searched successfully for user");

      return formattedResults;
    } catch (error: any) {
      logger.error({ error: error.message, query, userId }, "Failed to search items for user");
      throw new Error("Failed to search items for user: " + error.message);
    }
  }
}

import { Station } from "@backend/entities/Station";
import { StationPricelist, StationPricelistStatus } from "@backend/entities/StationPricelist";
import { Pricelist, PriceListStatus } from "@entities/Pricelist";
import { PricelistItem } from "@entities/PricelistItem";
import { DataSource, Repository } from "typeorm";
import logger from "@backend/utils/logger";
import { cache } from "@backend/utils/cache";

export class PricelistService {
  private pricelistRepository: Repository<Pricelist>;
  private pricelistItemRepository: Repository<PricelistItem>;
  private stationRepository: Repository<Station>;
  private stationPricelistRepository: Repository<StationPricelist>;

  constructor(datasource: DataSource) {
    this.pricelistRepository = datasource.getRepository(Pricelist);
    this.pricelistItemRepository = datasource.getRepository(PricelistItem);
    this.stationRepository = datasource.getRepository(Station);
    this.stationPricelistRepository = datasource.getRepository(StationPricelist);
  }

  public async createPricelist(
    payload: Partial<Pricelist>,
    user_id: number,
  ): Promise<Pricelist> {
    const newPricelist = {
      ...payload,
      // Don't set status explicitly - let entity default to INACTIVE
      created_by: user_id,
    }
    const pricelist: Pricelist = this.pricelistRepository.create(newPricelist);
    const saved = await this.pricelistRepository.save(pricelist);

    // Invalidate cache after creating pricelist
    cache.invalidate("pricelists");

    return saved;
  }

  async fetchPricelists() {
    const cacheKey = "pricelists_all";

    // Try cache first
    const cached = cache.get<Pricelist[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const startTime = Date.now();

    try {
      // Get all pricelists without station relationship (now handled by junction table)
      const pricelists = await this.pricelistRepository
        .createQueryBuilder("pricelist")
        .select([
          "pricelist.id",
          "pricelist.name",
          "pricelist.status",
          "pricelist.is_default",
          "pricelist.description",
          "pricelist.created_at",
          "pricelist.updated_at"
        ])
        .orderBy("pricelist.is_default", "DESC")
        .addOrderBy("pricelist.name", "ASC")
        .getMany();

      const duration = Date.now() - startTime;
      logger.debug({
        pricelistCount: pricelists.length,
        duration: `${duration}ms`,
        query: "fetchPricelists"
      }, "Fetched all pricelists");

      if (duration > 1000) {
        logger.warn({ duration: `${duration}ms` }, "Slow pricelist query detected");
      }

      // Cache the result
      cache.set(cacheKey, pricelists);
      return pricelists;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
        query: "fetchPricelists"
      }, "Error fetching pricelists");
      throw error;
    }
  }

  async fetchPricelistItems(pricelistId: string): Promise<any[]> {
    const cacheKey = `pricelist_items_${pricelistId}`;

    // Try cache first (prices can change, but cache for performance with 30s TTL)
    const cached = cache.get<any[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {

      const query = this.pricelistItemRepository
        .createQueryBuilder("pi")
        .innerJoin("pi.item", "item")
        .leftJoin("item.category", "category")
        .innerJoin("pi.pricelist", "pricelist")
        .select([
          "pi.id AS pricelistItemId",
          "pi.price AS price",
          "pi.currency AS currency",
          "pi.is_enabled AS isEnabled",
          "pi.pricelist_id AS pricelist_id",
          "item.id AS item_id",
          "item.name AS item_name",
          "item.code AS item_code",
          "item.isGroup AS item_isGroup",
          "item.isStock AS item_isStock",
          "item.allowNegativeInventory AS item_allowNegativeInventory",
          "category.id AS category_id",
          "category.name AS category_name",
          "pricelist.name AS pricelist_name",
        ])
        .where("pi.pricelist_id = :pricelistId", { pricelistId: Number(pricelistId) });
      // .andWhere("pi.is_enabled = :enabled", { enabled: 1 });

      // First, let's check if there are any pricelist items at all for this pricelist
      const basicCount = await this.pricelistItemRepository.count({
        where: { pricelist: { id: Number(pricelistId) } }
      });


      const rawItems = await query.getRawMany();

      // If no items found with joins, try a simpler approach
      if (rawItems.length === 0) {
        const simpleQuery = this.pricelistItemRepository
          .createQueryBuilder("pi")
          .leftJoin("pi.item", "item")
          .leftJoin("pi.pricelist", "pricelist")
          .select([
            "pi.id AS pricelistItemId",
            "pi.price AS price",
            "pi.currency AS currency",
            "pi.is_enabled AS isEnabled",
            "pi.pricelist_id AS pricelist_id",
            "item.id AS item_id",
            "item.name AS item_name",
            "item.code AS item_code",
            "item.isGroup AS item_isGroup",
            "item.isStock AS item_isStock",
            "item.allowNegativeInventory AS item_allowNegativeInventory",
            "pricelist.name AS pricelist_name",
          ])
          .where("pi.pricelist_id = :pricelistId", { pricelistId: Number(pricelistId) });

        const simpleItems = await simpleQuery.getRawMany();
        // Items found but not processed (fallback query)
      }

      const toBoolean = (value: any): boolean =>
        value === true ||
        value === 1 ||
        value === "1" ||
        value === "true" ||
        value === "TRUE";

      const mappedItems = rawItems.map((item) => ({
        id: item.item_id,
        name: item.item_name,
        code: item.item_code,
        // Raw keys can differ by driver/build aliases; normalize all likely variants.
        isGroup: toBoolean(item.item_isGroup ?? item.item_is_group ?? item.is_group),
        isStock: toBoolean(item.item_isStock ?? item.item_is_stock ?? item.is_stock),
        allowNegativeInventory: toBoolean(
          item.item_allowNegativeInventory ??
          item.item_allow_negative_inventory ??
          item.allow_negative_inventory
        ),
        category: item.category_id ? {
          id: item.category_id,
          name: item.category_name,
        } : null,
        price: item.price,
        currency: item.currency,
        pricelistItemId: item.pricelistItemId,
        pricelistId: item.pricelist_id ? Number(item.pricelist_id) : undefined,
        pricelistName: item.pricelist_name,
      }));

      // Cache the result
      cache.set(cacheKey, mappedItems);
      return mappedItems;
    } catch (error: any) {
      console.error(`Error fetching pricelist items for ${pricelistId}:`, error);
      throw new Error("Failed to fetch pricelist items: " + error);
    }
  }

  // Get all pricelists for a specific station (including global pricelists for admins only)
  async getPricelistsByStation(stationId: number, isAdmin: boolean = false): Promise<any[]> {
    const cacheKey = `pricelists_by_station_${stationId}_${isAdmin}`;

    // Try cache first
    const cached = cache.get<any[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {

      // Use QueryBuilder (FK columns) instead of nested relation `where` + `find()`.
      // Bundled production builds can throw inside TypeORM's executeEntitiesAndRawResults
      // (e.g. Cannot read properties of undefined reading 'length') — see UserService raw SQL note.
      const stationPricelists = await this.stationPricelistRepository
        .createQueryBuilder("sp")
        .leftJoinAndSelect("sp.station", "station")
        .leftJoinAndSelect("sp.pricelist", "pricelist")
        .where("sp.station_id = :stationId", { stationId })
        .orderBy("sp.is_default", "DESC")
        .addOrderBy("sp.created_at", "ASC")
        .getMany();

      let allPricelists = stationPricelists.map(sp => ({
        id: sp.pricelist.id,
        name: sp.pricelist.name,
        status: sp.pricelist.status,
        is_default: sp.is_default,
        description: sp.pricelist.description,
        station_pricelist_status: sp.status,
        station_id: stationId,
        notes: sp.notes,
        created_at: sp.created_at,
        updated_at: sp.updated_at
      }));

      // Only admins can see global pricelists (not linked to any station)
      if (isAdmin) {
        const globalPricelists = await this.pricelistRepository.find({
          where: {
            status: PriceListStatus.ACTIVE
          },
          order: { is_default: "DESC", name: "ASC" }
        });

        // Filter out pricelists already linked to this station
        const linkedPricelistIds = stationPricelists.map(sp => sp.pricelist.id);
        const unlinkedGlobalPricelists = globalPricelists
          .filter(p => !linkedPricelistIds.includes(p.id))
          .map(pricelist => ({
            id: pricelist.id,
            name: pricelist.name,
            status: pricelist.status,
            is_default: false,
            description: pricelist.description,
            station_pricelist_status: null,
            station_id: null,
            notes: null,
            created_at: pricelist.created_at,
            updated_at: pricelist.updated_at
          }));

        allPricelists = [...allPricelists, ...unlinkedGlobalPricelists];
      }

      // Cache the result
      cache.set(cacheKey, allPricelists);
      return allPricelists;
    } catch (error: any) {
      console.error(`Error fetching pricelists for station ${stationId}:`, error);
      throw new Error("Failed to fetch pricelists for station: " + error);
    }
  }

  // Get all pricelists that are active (for linking to stations)
  async getAvailablePricelists(): Promise<any[]> {
    const cacheKey = "available_pricelists";

    // Try cache first
    const cached = cache.get<any[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const pricelists = await this.pricelistRepository.find({
        where: {
          status: PriceListStatus.ACTIVE
        },
        order: { is_default: "DESC", name: "ASC" }
      });

      const result = pricelists.map(pricelist => ({
        id: pricelist.id,
        name: pricelist.name,
        status: pricelist.status,
        is_default: pricelist.is_default,
        description: pricelist.description
      }));

      // Cache the result
      cache.set(cacheKey, result);
      return result;
    } catch (error: any) {
      console.error("Error fetching available pricelists:", error);
      throw new Error("Failed to fetch available pricelists: " + error);
    }
  }

  // Get all stations using a specific pricelist
  async getStationsUsingPricelist(pricelistId: number): Promise<any[]> {
    const cacheKey = `stations_using_pricelist_${pricelistId}`;

    // Try cache first
    const cached = cache.get<any[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const stationPricelists = await this.stationPricelistRepository
        .createQueryBuilder("sp")
        .leftJoinAndSelect("sp.station", "station")
        .leftJoinAndSelect("sp.pricelist", "pricelist")
        .where("sp.pricelist_id = :pricelistId", { pricelistId })
        .orderBy("sp.created_at", "ASC")
        .getMany();

      const result = stationPricelists.map(sp => ({
        id: sp.station.id,
        name: sp.station.name,
        status: sp.station.status,
        is_default: sp.is_default,
        station_pricelist_status: sp.status,
        notes: sp.notes,
        linked_at: sp.created_at
      }));

      // Cache the result
      cache.set(cacheKey, result);
      return result;
    } catch (error: any) {
      console.error(`Error fetching stations using pricelist ${pricelistId}:`, error);
      throw new Error("Failed to fetch stations using pricelist: " + error);
    }
  }

  // Update pricelist status (affects all stations using it)
  async updatePricelistStatus(pricelistId: number, status: PriceListStatus): Promise<void> {
    try {
      const result = await this.pricelistRepository.update(
        { id: pricelistId },
        { status }
      );

      if (result.affected === 0) {
        throw new Error("Pricelist not found");
      }

      // Invalidate cache
      cache.invalidate("pricelists");
      cache.invalidate(`pricelist_${pricelistId}`);
      cache.invalidate(`pricelist_items_${pricelistId}`);
      cache.invalidate("pricelists_by_station");
      cache.invalidate("available_pricelists");
      cache.invalidate(`stations_using_pricelist_${pricelistId}`);
    } catch (error: any) {
      console.error(`Error updating pricelist ${pricelistId} status:`, error);
      throw new Error("Failed to update pricelist status: " + error);
    }
  }

  async getPricelistById(id: number): Promise<Pricelist | null> {
    const cacheKey = `pricelist_${id}`;

    // Try cache first
    const cached = cache.get<Pricelist | null>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.pricelistRepository
      .createQueryBuilder("pricelist")
      .leftJoinAndSelect("pricelist.stationPricelists", "sp")
      .leftJoinAndSelect("sp.station", "station")
      .where("pricelist.id = :id", { id })
      .getOne();

    // Cache the result
    cache.set(cacheKey, result);
    return result;
  }

  async removeItemFromPricelist(pricelistId: number, itemId: number): Promise<void> {
    const result = await this.pricelistItemRepository.delete({
      pricelist: { id: pricelistId },
      item: { id: itemId }
    });

    if (result.affected === 0) {
      throw new Error("Item not found in this pricelist");
    }

    // Invalidate cache
    cache.invalidate(`pricelist_items_${pricelistId}`);
    cache.invalidate("items");
  }
}

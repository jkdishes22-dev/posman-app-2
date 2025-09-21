import { Station } from "@backend/entities/Station";
import { StationPricelist, StationPricelistStatus } from "@backend/entities/StationPricelist";
import { Pricelist, PriceListStatus } from "@entities/Pricelist";
import { PricelistItem } from "@entities/PricelistItem";
import { DataSource, Repository } from "typeorm";
import logger from "@backend/utils/logger";

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
    return await this.pricelistRepository.save(pricelist);
  }

  async fetchPricelists() {
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
        query: 'fetchPricelists'
      }, 'Fetched all pricelists');

      if (duration > 1000) {
        logger.warn({ duration: `${duration}ms` }, 'Slow pricelist query detected');
      }

      return pricelists;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
        query: 'fetchPricelists'
      }, 'Error fetching pricelists');
      throw error;
    }
  }

  async fetchPricelistItems(pricelistId: string): Promise<any[]> {
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
          "item.id AS item_id",
          "item.name AS item_name",
          "item.code AS item_code",
          "item.isGroup AS item_isGroup",
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
            "item.id AS item_id",
            "item.name AS item_name",
            "item.code AS item_code",
            "item.isGroup AS item_isGroup",
            "pricelist.name AS pricelist_name",
          ])
          .where("pi.pricelist_id = :pricelistId", { pricelistId: Number(pricelistId) });

        const simpleItems = await simpleQuery.getRawMany();
        if (simpleItems.length > 0) {
        }
      }

      const mappedItems = rawItems.map((item) => ({
        id: item.item_id,
        name: item.item_name,
        code: item.item_code,
        isGroup: Boolean(item.item_isGroup),
        category: item.category_id ? {
          id: item.category_id,
          name: item.category_name,
        } : null,
        price: item.price,
        currency: item.currency,
        pricelistItemId: item.pricelistItemId,
        pricelistName: item.pricelist_name,
      }));

      return mappedItems;
    } catch (error: any) {
      console.error(`Error fetching pricelist items for ${pricelistId}:`, error);
      throw new Error("Failed to fetch pricelist items: " + error);
    }
  }

  // Get all pricelists for a specific station (including global pricelists for admins only)
  async getPricelistsByStation(stationId: number, isAdmin: boolean = false): Promise<any[]> {
    try {

      // Get pricelists linked to this specific station through junction table
      const stationPricelists = await this.stationPricelistRepository.find({
        where: { station: { id: stationId } },
        relations: ["pricelist"],
        order: { is_default: "DESC", created_at: "ASC" }
      });

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

      return allPricelists;
    } catch (error: any) {
      console.error(`Error fetching pricelists for station ${stationId}:`, error);
      throw new Error("Failed to fetch pricelists for station: " + error);
    }
  }

  // Get all pricelists that are active (for linking to stations)
  async getAvailablePricelists(): Promise<any[]> {
    try {
      const pricelists = await this.pricelistRepository.find({
        where: {
          status: PriceListStatus.ACTIVE
        },
        order: { is_default: "DESC", name: "ASC" }
      });

      return pricelists.map(pricelist => ({
        id: pricelist.id,
        name: pricelist.name,
        status: pricelist.status,
        is_default: pricelist.is_default,
        description: pricelist.description
      }));
    } catch (error: any) {
      console.error("Error fetching available pricelists:", error);
      throw new Error("Failed to fetch available pricelists: " + error);
    }
  }

  // Get all stations using a specific pricelist
  async getStationsUsingPricelist(pricelistId: number): Promise<any[]> {
    try {
      const stationPricelists = await this.stationPricelistRepository.find({
        where: { pricelist: { id: pricelistId } },
        relations: ["station"],
        order: { created_at: "ASC" }
      });

      return stationPricelists.map(sp => ({
        id: sp.station.id,
        name: sp.station.name,
        status: sp.station.status,
        is_default: sp.is_default,
        station_pricelist_status: sp.status,
        notes: sp.notes,
        linked_at: sp.created_at
      }));
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
    } catch (error: any) {
      console.error(`Error updating pricelist ${pricelistId} status:`, error);
      throw new Error("Failed to update pricelist status: " + error);
    }
  }

  async getPricelistById(id: number): Promise<Pricelist | null> {
    return await this.pricelistRepository.findOne({
      where: { id },
      relations: ["stationPricelists", "stationPricelists.station"],
    });
  }
}

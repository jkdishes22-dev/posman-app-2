import { Station } from "@backend/entities/Station";
import { Pricelist, PriceListStatus } from "@entities/Pricelist";
import { PricelistItem } from "@entities/PricelistItem";
import { DataSource, Repository } from "typeorm";

export class PricelistService {
  private pricelistRepository: Repository<Pricelist>;
  private pricelistItemRepository: Repository<PricelistItem>;
  private stationRepository: Repository<Station>;

  constructor(datasource: DataSource) {
    this.pricelistRepository = datasource.getRepository(Pricelist);
    this.pricelistItemRepository = datasource.getRepository(PricelistItem);
    this.stationRepository = datasource.getRepository(Station);
  }

  public async createPricelist(
    payload: Partial<Pricelist>,
    user_id: number,
  ): Promise<Pricelist> {
    const foundStation = await this.stationRepository.findOneBy({
      id: Number(payload.station),
    });
    const newPricelist = {
      ...payload,
      status: PriceListStatus.ACTIVE,
      created_by: user_id,
      station: foundStation ? { id: foundStation.id } : null,
    }
    const pricelist: Pricelist = this.pricelistRepository.create(newPricelist);
    return await this.pricelistRepository.save(pricelist);
  }

  async fetchPricelists() {
    // Optimized query with proper select and relations
    return await this.pricelistRepository
      .createQueryBuilder("pricelist")
      .leftJoinAndSelect("pricelist.station", "station")
      .select([
        "pricelist.id",
        "pricelist.name",
        "pricelist.status",
        "pricelist.is_default",
        "pricelist.created_at",
        "station.id",
        "station.name"
      ])
      .orderBy("pricelist.name", "ASC")
      .getMany();
  }

  async fetchPricelistItems(pricelistId: string): Promise<any[]> {
    try {
      console.log(`Fetching pricelist items for pricelist ID: ${pricelistId}`);

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
      console.log(`Basic count of pricelist items for pricelist ${pricelistId}:`, basicCount);

      // Log the generated SQL query
      const sql = query.getSql();
      console.log(`Generated SQL query:`, sql);
      console.log(`Query parameters:`, { pricelistId: Number(pricelistId) });

      const rawItems = await query.getRawMany();
      console.log(`Raw items from database for pricelist ${pricelistId}:`, rawItems);

      // If no items found with joins, try a simpler approach
      if (rawItems.length === 0) {
        console.log(`No items found with joins, trying simpler query...`);
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
        console.log(`Simple query results for pricelist ${pricelistId}:`, simpleItems);

        if (simpleItems.length > 0) {
          console.log(`Found ${simpleItems.length} items with simple query, issue might be with category join`);
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

      console.log(`Mapped items for pricelist ${pricelistId}:`, mappedItems);
      return mappedItems;
    } catch (error: any) {
      console.error(`Error fetching pricelist items for ${pricelistId}:`, error);
      throw new Error("Failed to fetch pricelist items: " + error);
    }
  }

  // Get all pricelists for a specific station (including global pricelists for admins only)
  async getPricelistsByStation(stationId: number, isAdmin: boolean = false): Promise<any[]> {
    try {
      console.log(`Fetching pricelists for station ID: ${stationId}, isAdmin: ${isAdmin}`);

      // Get pricelists linked to this specific station
      const stationPricelists = await this.pricelistRepository.find({
        where: { station: { id: stationId } },
        relations: ["station"],
        order: { is_default: "DESC", name: "ASC" }
      });

      let allPricelists = [...stationPricelists];

      // Only admins can see global pricelists (not linked to any station)
      if (isAdmin) {
        const globalPricelists = await this.pricelistRepository.find({
          where: {
            station: null,
            status: "active"
          },
          relations: ["station"],
          order: { is_default: "DESC", name: "ASC" }
        });

        allPricelists = [...stationPricelists, ...globalPricelists];
        console.log(`Admin access: Found ${stationPricelists.length} station-specific pricelists and ${globalPricelists.length} global pricelists`);
      } else {
        console.log(`Non-admin access: Found ${stationPricelists.length} station-specific pricelists only`);
      }

      // Deduplicate by ID
      const uniquePricelists = allPricelists.filter((pricelist, index, self) =>
        index === self.findIndex(p => p.id === pricelist.id)
      );

      console.log(`After deduplication: ${uniquePricelists.length} unique pricelists`);

      return uniquePricelists.map(pricelist => ({
        id: pricelist.id,
        name: pricelist.name,
        is_default: pricelist.is_default,
        status: pricelist.status,
        station_id: pricelist.station?.id,
        station_name: pricelist.station?.name
      }));
    } catch (error: any) {
      console.error(`Error fetching pricelists for station ${stationId}:`, error);
      throw new Error("Failed to fetch pricelists for station: " + error);
    }
  }

  // Get all pricelists that are not linked to any station and are active
  async getAvailablePricelists(): Promise<any[]> {
    try {
      const pricelists = await this.pricelistRepository.find({
        where: {
          station: null,
          status: PriceListStatus.ACTIVE
        },
        order: { name: "ASC" }
      });

      return pricelists.map(pricelist => ({
        id: pricelist.id,
        name: pricelist.name,
        is_default: pricelist.is_default,
        status: pricelist.status
      }));
    } catch (error: any) {
      throw new Error("Failed to fetch available pricelists: " + error);
    }
  }
}

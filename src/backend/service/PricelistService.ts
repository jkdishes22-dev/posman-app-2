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
    const pricelist: Pricelist = this.pricelistRepository.create({
      ...payload,
      status: PriceListStatus.ACTIVE,
      created_by: user_id,
      station: foundStation ? foundStation.id : null,
    });
    return this.pricelistRepository.save(pricelist);
  }

  async fetchPricelists() {
    return await this.pricelistRepository.find();
  }

  async fetchPricelistItems(pricelistId: string): Promise<any[]> {
    try {
      const query = this.pricelistItemRepository
        .createQueryBuilder("pi")
        .innerJoin("pi.item", "item")
        .innerJoin("item.category", "category")
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
        .where("pi.pricelist_id = :pricelistId", { pricelistId });
      // .andWhere("pi.is_enabled = :enabled", { enabled: 1 });

      const rawItems = await query.getRawMany();

      return rawItems.map((item) => ({
        id: item.item_id,
        name: item.item_name,
        code: item.item_code,
        isGroup: item.item_isGroup,
        category: {
          id: item.category_id,
          name: item.category_name,
        },
        price: item.price,
        currency: item.currency,
        pricelistItemId: item.pricelistItemId,
        pricelistName: item.pricelist_name,
      }));
    } catch (error: any) {
      throw new Error("Failed to fetch pricelist items: " + error);
    }
  }
}

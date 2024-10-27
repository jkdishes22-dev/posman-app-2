import { AppDataSource } from "@backend/config/data-source";
import { Pricelist, PriceListStatus } from "@entities/Pricelist";
import { PricelistItem } from "@entities/PricelistItem";

export class PricelistService {
  private pricelistRepository = AppDataSource.getRepository(Pricelist);
  private pricelistItemRepository = AppDataSource.getRepository(PricelistItem);

  public async createPricelist(
    payload: Partial<Pricelist>,
    user_id: number,
  ): Promise<Pricelist> {
    const pricelist: Pricelist = this.pricelistRepository.create({
      ...payload,
      status: PriceListStatus.ACTIVE,
      created_by: user_id,
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
        .innerJoin("pi.pricelist", "pricelist") // Join pricelist table
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
          "pricelist.name AS pricelist_name", // Fetch pricelist name
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
        pricelistName: item.pricelist_name, // Include pricelist name in response
      }));
    } catch (error) {
      throw new Error("Failed to fetch pricelist items: " + error);
    }
  }
}

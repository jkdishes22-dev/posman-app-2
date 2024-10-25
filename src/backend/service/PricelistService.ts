import { AppDataSource } from "@backend/config/data-source";
import { Pricelist, PriceListStatus } from "@entities/Pricelist";
import { BillStatus } from "@entities/Bill";

export class PricelistService {
  private pricelistRepository = AppDataSource.getRepository(Pricelist);

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
}

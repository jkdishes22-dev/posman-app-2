import { Item, ItemStatus } from "@backend/entities/Item";
import { Service } from "typedi";
import { DataSource, Repository } from "typeorm";

@Service()
export class ProductionService {
  private itemRepository: Repository<Item>;

  constructor(datasource: DataSource) {
    this.itemRepository = datasource.getRepository(Item);
  }

  async createProductionItem(payload: any, userId: number) {
    const createdItem = this.itemRepository.create({
      ...payload,
      created_by: userId,
      status: ItemStatus.ACTIVE,
    });

    const savedItem = await this.itemRepository.save(createdItem);
    return savedItem;
  }

  async fetchProductionItems() {
    const items = await this.itemRepository.find({
      where: {
        isStock: true,
      },
    });
    return items;
  }
}

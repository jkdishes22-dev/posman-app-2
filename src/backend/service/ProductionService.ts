import { Item, ItemStatus } from "@backend/entities/Item";
import { Service } from "typedi";
import { DataSource, Repository } from "typeorm";
import { cache } from "@backend/utils/cache";

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

    // Invalidate cache after creating item
    cache.invalidateMany(["production_items_composite", "production_items_sellable", "items"]);

    return savedItem;
  }

  async fetchProductionItems(compositeOnly: boolean = false) {
    const cacheKey = compositeOnly ? "production_items_composite" : "production_items_sellable";

    // Try cache first
    const cached = cache.get<Item[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    let items: Item[];

    if (compositeOnly) {
      // Return only composite items (isGroup: true) for recipes
      items = await this.itemRepository.find({
        where: {
          isGroup: true,
        },
      });
    } else {
      // Return sellable items (isStock: false) for production issuing
      // These are the items that can be produced and sold
      items = await this.itemRepository.find({
        where: {
          isStock: false,
        },
      });
    }

    // Cache the result
    cache.set(cacheKey, items);
    return items;
  }
}

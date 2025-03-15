import { Item, ItemStatus } from "@backend/entities/Item";
import Container, { Inject, Service } from "typedi";
import { DataSource, Repository } from "typeorm";

@Service()
export class ProductionService {
    
    private itemRepository: Repository<Item>;
   private dataSource = Container.get<DataSource>('DATA_SOURCE');
       
 constructor() {
        this.itemRepository = this.dataSource.getRepository(Item);
    }

    async createProductionItem(payload: any, userId: number) {
        const createdItem = this.itemRepository.create(
            {
                ...payload,
                created_by: userId,
                status: ItemStatus.ACTIVE,
            }
        );

        const savedItem = await this.itemRepository.save(createdItem);
        return savedItem;
    }

    async fetchProductionItems() {
        const items = this.itemRepository.find({
            where: {
                isStock: true
            }
        });
        return items;
    }

}

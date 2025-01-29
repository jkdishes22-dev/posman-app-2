import { AppDataSource } from "@backend/config/data-source";
import { Item, ItemStatus } from "@backend/entities/Item";
import { Station } from "@backend/entities/Station";
import { Service } from "typedi";
import { Repository } from "typeorm";

@Service()
export class InventoryService {
    private itemRepository: Repository<Item>;
    constructor() {
        this.itemRepository = AppDataSource.getRepository(Item);
    }

    async createInventoryItem(payload: any, userId: number) {
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

    async fetchInventoryItems() {
        // Simulate fetching from a database
        const items = [
            { id: 1, name: "Item 1", quantity: 10, createdAt: new Date() },
            { id: 2, name: "Item 2", quantity: 5, createdAt: new Date() },
        ];

        // Return the list of items
        return items;
    }

}
import { DataSource, Repository } from "typeorm";
import { PurchaseItem } from "@backend/entities/PurchaseItem";
import { Item, ItemStatus } from "@backend/entities/Item";

export interface CreatePurchaseItemInput {
    item_id: number;
    purchase_unit_label: string;
    purchase_unit_qty: number;
    unit_of_measure?: string | null;
    is_active?: boolean;
    default_purchase_price?: number | null;
}

export interface UpdatePurchaseItemInput {
    purchase_unit_label?: string;
    purchase_unit_qty?: number;
    unit_of_measure?: string | null;
    is_active?: boolean;
    default_purchase_price?: number | null;
}

export class PurchaseItemService {
    private repo: Repository<PurchaseItem>;
    private itemRepo: Repository<Item>;

    constructor(dataSource: DataSource) {
        this.repo = dataSource.getRepository(PurchaseItem);
        this.itemRepo = dataSource.getRepository(Item);
    }

    async list(activeOnly = false): Promise<PurchaseItem[]> {
        const qb = this.repo
            .createQueryBuilder("pi")
            .leftJoinAndSelect("pi.item", "item")
            .leftJoinAndSelect("item.category", "category");
        if (activeOnly) {
            qb.where("pi.is_active = :a", { a: true });
        }
        return qb.orderBy("item.name", "ASC").getMany();
    }

    async getById(id: number): Promise<PurchaseItem | null> {
        return this.repo.findOne({ where: { id }, relations: ["item", "item.category"] });
    }

    async getByItemId(itemId: number): Promise<PurchaseItem | null> {
        return this.repo.findOne({
            where: { item_id: itemId },
            relations: ["item"],
        });
    }

    async create(input: CreatePurchaseItemInput, userId: number): Promise<PurchaseItem> {
        const item = await this.itemRepo.findOne({ where: { id: input.item_id } });
        if (!item) {
            throw new Error(`Item ${input.item_id} not found`);
        }
        if (item.status !== ItemStatus.ACTIVE) {
            throw new Error(`Item "${item.name}" is not active`);
        }
        const isGroup = Boolean(item.isGroup) || Number((item as any).is_group) === 1;
        if (isGroup) {
            throw new Error(`Item "${item.name}" is a group product; group items cannot have purchase configs`);
        }
        const isStock = Boolean(item.isStock) || Number((item as any).is_stock) === 1;
        if (!isStock) {
            throw new Error(`Item "${item.name}" is not marked as suppliable (is_stock); set that first`);
        }

        const existing = await this.repo.findOne({ where: { item_id: input.item_id } });
        if (existing) {
            throw new Error(`A purchase config already exists for "${item.name}"`);
        }

        const record = this.repo.create({
            item_id: input.item_id,
            purchase_unit_label: input.purchase_unit_label.trim(),
            purchase_unit_qty: input.purchase_unit_qty,
            unit_of_measure: input.unit_of_measure?.trim() || null,
            is_active: input.is_active !== false,
            default_purchase_price: input.default_purchase_price ?? null,
            created_by: userId,
        });
        return this.repo.save(record);
    }

    async update(id: number, input: UpdatePurchaseItemInput, userId: number): Promise<PurchaseItem> {
        const record = await this.repo.findOne({ where: { id } });
        if (!record) {
            throw new Error(`PurchaseItem ${id} not found`);
        }
        if (input.purchase_unit_label !== undefined) {
            record.purchase_unit_label = input.purchase_unit_label.trim();
        }
        if (input.purchase_unit_qty !== undefined) {
            record.purchase_unit_qty = input.purchase_unit_qty;
        }
        if (input.unit_of_measure !== undefined) {
            record.unit_of_measure = input.unit_of_measure?.trim() || null;
        }
        if (input.is_active !== undefined) {
            record.is_active = input.is_active;
        }
        if (input.default_purchase_price !== undefined) {
            record.default_purchase_price = input.default_purchase_price ?? null;
        }
        record.updated_by = userId;
        return this.repo.save(record);
    }

    async delete(id: number): Promise<void> {
        const record = await this.repo.findOne({ where: { id } });
        if (!record) {
            throw new Error(`PurchaseItem ${id} not found`);
        }
        await this.repo.remove(record);
    }
}

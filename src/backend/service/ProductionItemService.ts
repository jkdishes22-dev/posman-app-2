import { ProductionItem, ProductionItemStatus } from "@backend/entities/ProductionItem";
import { Production, ProductionStatus } from "@backend/entities/Production";
import { Item } from "@backend/entities/Item";
import { User } from "@backend/entities/User";
import { InventoryService } from "./InventoryService";
import { DataSource, Repository } from "typeorm";
import {
    assignBaseEntityDates,
    mapItemRowWithPrefix,
    mapUserRowWithPrefix,
} from "@backend/utils/sqlEntityMappers";

export interface IssueProductionItemInput {
    production_id: number;
    item_id: number;
    quantity_produced: number;
    notes?: string;
    issued_at?: Date;
}

export interface UpdateProductionItemInput {
    item_id?: number;
    quantity_produced?: number;
    notes?: string | null;
    issued_at?: Date;
}

export interface ProductionItemFilters {
    production_id?: number;
    item_id?: number;
    issued_by?: number;
    start_date?: Date;
    end_date?: Date;
    item_search?: string;
    status?: string;
}

export class ProductionItemService {
    private productionItemRepository: Repository<ProductionItem>;
    private productionRepository: Repository<Production>;
    private itemRepository: Repository<Item>;
    private userRepository: Repository<User>;
    private inventoryService: InventoryService;

    constructor(dataSource: DataSource) {
        this.productionItemRepository = dataSource.getRepository(ProductionItem);
        this.productionRepository = dataSource.getRepository(Production);
        this.itemRepository = dataSource.getRepository(Item);
        this.userRepository = dataSource.getRepository(User);
        this.inventoryService = new InventoryService(dataSource);
    }

    public async issueItem(input: IssueProductionItemInput, userId: number): Promise<ProductionItem> {
        const production = await this.productionRepository.findOne({ where: { id: input.production_id } });
        if (!production) throw new Error(`Production ${input.production_id} not found`);
        if (production.status !== ProductionStatus.OPEN) {
            throw new Error(`Cannot add items to a ${production.status} production. Open a new one first.`);
        }

        const item = await this.itemRepository.findOne({ where: { id: input.item_id } });
        if (!item) throw new Error(`Item ${input.item_id} not found`);
        if (item.isGroup) {
            throw new Error("Grouped/composite items cannot be issued directly. Please issue recipe components instead.");
        }
        if (input.quantity_produced <= 0) {
            throw new Error("Quantity must be greater than 0");
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new Error(`User ${userId} not found`);

        const issuedAt = input.issued_at ? new Date(input.issued_at) : new Date();

        const productionItem = this.productionItemRepository.create({
            production_id: input.production_id,
            item_id: input.item_id,
            quantity_produced: input.quantity_produced,
            status: ProductionItemStatus.ISSUED,
            issued_by: userId,
            issued_at: issuedAt,
            notes: input.notes || null,
            created_by: userId,
        });

        const saved = await this.productionItemRepository.save(productionItem);

        await this.inventoryService.addInventoryFromProduction(
            input.item_id,
            input.quantity_produced,
            saved.id,
            userId,
        );

        return saved;
    }

    public async updateItem(
        productionItemId: number,
        input: UpdateProductionItemInput,
        userId: number,
    ): Promise<ProductionItem> {
        const existing = await this.productionItemRepository.findOne({ where: { id: productionItemId } });
        if (!existing) throw new Error(`Production item ${productionItemId} not found`);

        const production = await this.productionRepository.findOne({ where: { id: existing.production_id! } });
        if (!production) throw new Error("Production not found");
        if (production.status !== ProductionStatus.OPEN) {
            throw new Error(`Cannot edit items in a ${production.status} production.`);
        }

        const newItemId = input.item_id ?? existing.item_id;
        const newQty = input.quantity_produced ?? existing.quantity_produced;

        if (newQty <= 0) throw new Error("Quantity must be greater than 0");

        if (newItemId !== existing.item_id) {
            const newItem = await this.itemRepository.findOne({ where: { id: newItemId } });
            if (!newItem) throw new Error(`Item ${newItemId} not found`);
            if (newItem.isGroup) throw new Error("Grouped items cannot be issued directly.");
        }

        await this.inventoryService.reverseAndReapplyProduction(
            existing.item_id,
            existing.quantity_produced,
            newItemId,
            newQty,
            productionItemId,
            userId,
        );

        const issuedAt = input.issued_at ?? existing.issued_at;
        await this.productionItemRepository.update(productionItemId, {
            item_id: newItemId,
            quantity_produced: newQty,
            notes: input.notes !== undefined ? input.notes : existing.notes,
            issued_at: issuedAt ?? undefined,
            updated_by: userId,
        } as any);

        const updated = await this.fetchItemById(productionItemId);
        if (!updated) throw new Error("Failed to reload updated item");
        return updated;
    }

    public async cancelItem(productionItemId: number, userId: number): Promise<void> {
        const existing = await this.productionItemRepository.findOne({ where: { id: productionItemId } });
        if (!existing) throw new Error(`Production item ${productionItemId} not found`);
        if (existing.status !== ProductionItemStatus.ISSUED) {
            throw new Error("Only issued items can be cancelled.");
        }

        await this.inventoryService.reverseAndReapplyProduction(
            existing.item_id,
            existing.quantity_produced,
            existing.item_id,
            0,
            productionItemId,
            userId,
        );

        await this.productionItemRepository.update(productionItemId, {
            status: ProductionItemStatus.CANCELLED,
            updated_by: userId,
        } as any);
    }

    public async fetchItems(
        filters: ProductionItemFilters = {},
        limit: number = 100,
        offset: number = 0,
    ): Promise<{ items: ProductionItem[]; total: number }> {
        const params: unknown[] = [];
        const filterSql = ProductionItemService.buildFilterClause(filters, params);

        const countRows = (await this.productionItemRepository.manager.query(
            `SELECT COUNT(*) AS cnt FROM "production_item" pi WHERE 1=1${filterSql}`,
            params,
        )) as Array<{ cnt: number | string }>;
        const total = Number(countRows[0]?.cnt ?? 0);

        const sql = `
            SELECT
                pi.id, pi.production_id, pi.item_id, pi.quantity_produced,
                pi.status, pi.issued_by, pi.issued_at, pi.notes,
                pi.created_at, pi.updated_at, pi.created_by, pi.updated_by,
                p.id AS p_id, p.name AS p_name, p.status AS p_status,
                it.id AS it_id, it.name AS it_name, it.code AS it_code,
                it.status AS it_status, it.item_category_id AS it_category_id,
                it.default_unit_id AS it_default_unit_id,
                it.is_group AS it_is_group, it.is_stock AS it_is_stock,
                it.allow_negative_inventory AS it_allow_negative_inventory,
                it.created_at AS it_created_at, it.updated_at AS it_updated_at,
                it.created_by AS it_created_by, it.updated_by AS it_updated_by,
                iu.id AS iu_id, iu.firstName AS iu_firstName,
                iu.lastName AS iu_lastName, iu.username AS iu_username
            FROM "production_item" pi
            LEFT JOIN "production" p ON p.id = pi.production_id
            LEFT JOIN "item" it ON it.id = pi.item_id
            LEFT JOIN "user" iu ON iu.id = pi.issued_by
            WHERE 1=1${filterSql}
            ORDER BY pi.issued_at DESC, pi.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const rows = (await this.productionItemRepository.manager.query(sql, [
            ...params, limit, offset,
        ])) as Record<string, unknown>[];

        const items = Array.isArray(rows) ? rows.map(ProductionItemService.mapRow) : [];
        return { items, total };
    }

    public async fetchItemById(id: number): Promise<ProductionItem | null> {
        const sql = `
            SELECT
                pi.id, pi.production_id, pi.item_id, pi.quantity_produced,
                pi.status, pi.issued_by, pi.issued_at, pi.notes,
                pi.created_at, pi.updated_at, pi.created_by, pi.updated_by,
                p.id AS p_id, p.name AS p_name, p.status AS p_status,
                it.id AS it_id, it.name AS it_name, it.code AS it_code,
                it.status AS it_status, it.item_category_id AS it_category_id,
                it.default_unit_id AS it_default_unit_id,
                it.is_group AS it_is_group, it.is_stock AS it_is_stock,
                it.allow_negative_inventory AS it_allow_negative_inventory,
                it.created_at AS it_created_at, it.updated_at AS it_updated_at,
                it.created_by AS it_created_by, it.updated_by AS it_updated_by,
                iu.id AS iu_id, iu.firstName AS iu_firstName,
                iu.lastName AS iu_lastName, iu.username AS iu_username
            FROM "production_item" pi
            LEFT JOIN "production" p ON p.id = pi.production_id
            LEFT JOIN "item" it ON it.id = pi.item_id
            LEFT JOIN "user" iu ON iu.id = pi.issued_by
            WHERE pi.id = ?
            LIMIT 1
        `;
        const rows = (await this.productionItemRepository.manager.query(sql, [id])) as Record<string, unknown>[];
        if (!rows.length) return null;
        return ProductionItemService.mapRow(rows[0]);
    }

    private static buildFilterClause(filters: ProductionItemFilters, params: unknown[]): string {
        const parts: string[] = [];
        if (filters.production_id != null) {
            parts.push("pi.production_id = ?");
            params.push(filters.production_id);
        }
        if (filters.item_id != null) {
            parts.push("pi.item_id = ?");
            params.push(filters.item_id);
        }
        if (filters.issued_by != null) {
            parts.push("pi.issued_by = ?");
            params.push(filters.issued_by);
        }
        if (filters.status) {
            parts.push("pi.status = ?");
            params.push(filters.status);
        }
        if (filters.item_search?.trim()) {
            parts.push("(it.name LIKE ? OR it.code LIKE ?)");
            const q = `%${filters.item_search.trim()}%`;
            params.push(q, q);
        }
        if (filters.start_date) {
            const d = new Date(filters.start_date);
            if (!Number.isNaN(d.getTime())) {
                parts.push("pi.issued_at >= ?");
                params.push(d.toISOString());
            }
        }
        if (filters.end_date) {
            const d = new Date(filters.end_date);
            if (!Number.isNaN(d.getTime())) {
                d.setHours(23, 59, 59, 999);
                parts.push("pi.issued_at <= ?");
                params.push(d.toISOString());
            }
        }
        return parts.length ? ` AND ${parts.join(" AND ")}` : "";
    }

    private static mapRow(row: Record<string, unknown>): ProductionItem {
        const pi = new ProductionItem();
        pi.id = Number(row.id);
        pi.production_id = row.production_id != null ? Number(row.production_id) : null;
        pi.item_id = Number(row.item_id);
        pi.quantity_produced = Number(row.quantity_produced);
        pi.status = row.status as ProductionItemStatus;
        pi.issued_by = row.issued_by != null ? Number(row.issued_by) : null;
        pi.issued_at = (row.issued_at as Date) ?? null;
        pi.notes = row.notes != null ? String(row.notes) : null;
        if (row.created_by != null) pi.created_by = Number(row.created_by);
        if (row.updated_by != null) pi.updated_by = Number(row.updated_by);
        assignBaseEntityDates(pi, row.created_at, row.updated_at);

        pi.item = row.it_id != null ? mapItemRowWithPrefix(row, "it") : ({ id: pi.item_id } as Item);
        pi.issued_by_user = mapUserRowWithPrefix(row, "iu");

        if (row.p_id != null) {
            const p = new Production();
            p.id = Number(row.p_id);
            p.name = String(row.p_name);
            p.status = row.p_status as ProductionStatus;
            pi.production = p;
        } else {
            pi.production = null;
        }

        return pi;
    }
}

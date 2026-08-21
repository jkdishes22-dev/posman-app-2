import { Production, ProductionStatus } from "@backend/entities/Production";
import { ProductionItem, ProductionItemStatus } from "@backend/entities/ProductionItem";
import { DataSource, Repository } from "typeorm";
import { InventoryService } from "./InventoryService";
import {
    assignBaseEntityDates,
    mapUserRowWithPrefix,
    mapItemRowWithPrefix,
} from "@backend/utils/sqlEntityMappers";

export interface CreateProductionInput {
    name: string;
    description?: string;
}

export class ProductionSessionService {
    private productionRepository: Repository<Production>;
    private productionItemRepository: Repository<ProductionItem>;
    private inventoryService: InventoryService;

    constructor(dataSource: DataSource) {
        this.productionRepository = dataSource.getRepository(Production);
        this.productionItemRepository = dataSource.getRepository(ProductionItem);
        this.inventoryService = new InventoryService(dataSource);
    }

    public async createProduction(input: CreateProductionInput, userId: number): Promise<Production> {
        if (!input.name?.trim()) {
            throw new Error("Production name is required");
        }
        const existing = await this.productionRepository.findOne({ where: { name: input.name.trim() } });
        if (existing && !existing.deleted_at && existing.status === ProductionStatus.OPEN) {
            throw new Error(`A production named "${input.name.trim()}" already exists. Please use a different name.`);
        }
        const production = this.productionRepository.create({
            name: input.name.trim(),
            description: input.description?.trim() || null,
            status: ProductionStatus.OPEN,
            created_by: userId,
        });
        return this.productionRepository.save(production);
    }

    /**
     * Delete a production.
     * - No issued items → hard delete.
     * - Has issued items → soft delete (sets deleted_at) so inventory transaction
     *   audit trail is preserved.
     * Returns `{ deleted: true }` for hard delete, `{ archived: true, itemCount }` for soft.
     */
    public async deleteProduction(
        id: number,
        userId: number,
    ): Promise<{ deleted: boolean; archived: boolean; itemCount: number }> {
        const production = await this.productionRepository.findOne({ where: { id } });
        if (!production) throw new Error(`Production ${id} not found`);

        const countRows = (await this.productionRepository.manager.query(
            "SELECT COUNT(*) AS cnt FROM \"production_item\" WHERE production_id = ? AND status = 'issued'",
            [id],
        )) as Array<{ cnt: number | string }>;
        const itemCount = Number(countRows[0]?.cnt ?? 0);

        if (itemCount === 0) {
            await this.productionRepository.delete(id);
            return { deleted: true, archived: false, itemCount: 0 };
        }

        // Load issued items to reverse their inventory
        const issuedItems = (await this.productionItemRepository.manager.query(
            "SELECT id, item_id, quantity_produced FROM \"production_item\" WHERE production_id = ? AND status = 'issued'",
            [id],
        )) as Array<{ id: number; item_id: number; quantity_produced: number }>;

        // Reverse each item's inventory and mark it cancelled
        for (const pi of issuedItems) {
            await this.inventoryService.reverseAndReapplyProduction(
                pi.item_id, pi.quantity_produced,  // reverse: remove old qty
                pi.item_id, 0,                      // apply: add 0 (net = reversal only)
                pi.id, userId,
            );
            await this.productionItemRepository.update(pi.id, {
                status: ProductionItemStatus.CANCELLED,
                updated_by: userId,
            } as any);
        }

        await this.productionRepository.update(id, {
            deleted_at: new Date(),
            updated_by: userId,
        } as any);
        return { deleted: false, archived: true, itemCount };
    }

    public async closeProduction(id: number, userId: number): Promise<Production> {
        const production = await this.productionRepository.findOne({ where: { id } });
        if (!production) throw new Error(`Production ${id} not found`);
        if (production.status === ProductionStatus.CLOSED) return production;
        production.status = ProductionStatus.CLOSED;
        production.updated_by = userId;
        return this.productionRepository.save(production);
    }

    /** Returns earliest shift start in minutes-since-midnight EAT, or 360 (06:00) if none configured. */
    private async getDayShiftStartMinutes(): Promise<number> {
        try {
            const rows = (await this.productionRepository.manager.query(
                "SELECT value FROM system_settings WHERE key = ?",
                ["system_settings"],
            )) as Array<{ value: string }>;
            if (rows.length) {
                const settings = JSON.parse(rows[0].value) as Record<string, unknown>;
                const shifts = (settings.business_shifts ?? []) as Array<{ start_time?: string }>;
                const candidates = shifts
                    .map((s) => {
                        const parts = (s.start_time ?? "").split(":");
                        const h = parseInt(parts[0] ?? "", 10);
                        const m = parseInt(parts[1] ?? "", 10);
                        return isNaN(h) || isNaN(m) ? Infinity : h * 60 + m;
                    })
                    .filter((v) => v < Infinity);
                if (candidates.length) return Math.min(...candidates);
            }
        } catch {
            // fall through to default
        }
        return 360; // 06:00
    }

    /**
     * Auto-close open productions that belong to a previous business day.
     * Runs only when `production_settings.auto_close_at_shift_start` is true.
     */
    public async autoCloseStaleProductions(): Promise<void> {
        try {
            const settingRows = (await this.productionRepository.manager.query(
                "SELECT value FROM system_settings WHERE key = ?",
                ["production_settings"],
            )) as Array<{ value: string }>;
            if (!settingRows.length) return;
            const prodSettings = JSON.parse(settingRows[0].value) as Record<string, unknown>;
            if (!prodSettings.auto_close_at_shift_start) return;
        } catch {
            return;
        }

        const shiftStartMinutes = await this.getDayShiftStartMinutes();

        // Convert shift start to UTC offset: EAT = UTC+3, so shift EAT = (shiftStartMinutes - 180) minutes UTC
        const shiftStartOffsetMs = (shiftStartMinutes - 180) * 60 * 1000;

        // "Today" in EAT = UTC + 3h
        const nowMs = Date.now();
        const nowEAT = new Date(nowMs + 3 * 60 * 60 * 1000);
        const eatDateMidnightUTC = Date.UTC(
            nowEAT.getUTCFullYear(),
            nowEAT.getUTCMonth(),
            nowEAT.getUTCDate(),
        );

        // Today's shift start in UTC
        const todayShiftStartMs = eatDateMidnightUTC + shiftStartOffsetMs;

        // If it's not yet today's shift start, use yesterday's shift start
        const cutoffMs = nowMs < todayShiftStartMs
            ? todayShiftStartMs - 24 * 60 * 60 * 1000
            : todayShiftStartMs;

        const cutoff = new Date(cutoffMs).toISOString();

        await this.productionRepository.manager.query(
            `UPDATE "production" SET status = 'closed', updated_at = CURRENT_TIMESTAMP
             WHERE status = 'open' AND deleted_at IS NULL AND created_at < ?`,
            [cutoff],
        );
    }

    public async fetchProductions(filters: {
        status?: ProductionStatus;
        start_date?: Date;
        end_date?: Date;
        search?: string;
        limit?: number;
        offset?: number;
    }): Promise<{ productions: Production[]; total: number }> {
        await this.autoCloseStaleProductions();
        const params: unknown[] = [];
        const clauses: string[] = [];

        if (filters.search?.trim()) {
            clauses.push("p.name LIKE ?");
            params.push(`%${filters.search.trim()}%`);
        }
        if (filters.status) {
            clauses.push("p.status = ?");
            params.push(filters.status);
        }
        if (filters.start_date) {
            clauses.push("p.created_at >= ?");
            params.push(new Date(filters.start_date).toISOString());
        }
        if (filters.end_date) {
            const end = new Date(filters.end_date);
            end.setHours(23, 59, 59, 999);
            clauses.push("p.created_at <= ?");
            params.push(end.toISOString());
        }

        const where = clauses.length ? ` AND ${clauses.join(" AND ")}` : "";
        const limit = filters.limit ?? 100;
        const offset = filters.offset ?? 0;

        const countRows = (await this.productionRepository.manager.query(
            `SELECT COUNT(*) AS cnt FROM "production" p WHERE p.deleted_at IS NULL${where}`,
            params,
        )) as Array<{ cnt: number | string }>;
        const total = Number(countRows[0]?.cnt ?? 0);

        const rows = (await this.productionRepository.manager.query(
            `SELECT p.id, p.name, p.description, p.status, p.created_by, p.updated_by,
                    p.created_at, p.updated_at,
                    (SELECT COUNT(*) FROM "production_item" pi WHERE pi.production_id = p.id AND pi.status = 'issued') AS item_count
             FROM "production" p
             WHERE p.deleted_at IS NULL${where}
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset],
        )) as Record<string, unknown>[];

        const productions = rows.map((row) => {
            const p = new Production();
            p.id = Number(row.id);
            p.name = String(row.name);
            p.description = row.description != null ? String(row.description) : null;
            p.status = row.status as ProductionStatus;
            p.created_by = row.created_by != null ? Number(row.created_by) : 0;
            p.updated_by = row.updated_by != null ? Number(row.updated_by) : 0;
            assignBaseEntityDates(p, row.created_at, row.updated_at);
            (p as any).item_count = Number(row.item_count ?? 0);
            return p;
        });

        return { productions, total };
    }

    public async fetchProductionById(id: number): Promise<Production | null> {
        const rows = (await this.productionRepository.manager.query(
            `SELECT
                p.id, p.name, p.description, p.status, p.created_by, p.updated_by,
                p.created_at, p.updated_at,
                pi.id AS pi_id,
                pi.production_id AS pi_production_id,
                pi.item_id AS pi_item_id,
                pi.quantity_produced AS pi_quantity_produced,
                pi.status AS pi_status,
                pi.issued_by AS pi_issued_by,
                pi.issued_at AS pi_issued_at,
                pi.notes AS pi_notes,
                pi.created_at AS pi_created_at,
                pi.updated_at AS pi_updated_at,
                pi.created_by AS pi_created_by,
                pi.updated_by AS pi_updated_by,
                it.id AS it_id,
                it.name AS it_name,
                it.code AS it_code,
                it.status AS it_status,
                it.item_category_id AS it_category_id,
                it.default_unit_id AS it_default_unit_id,
                it.is_group AS it_is_group,
                it.is_stock AS it_is_stock,
                it.allow_negative_inventory AS it_allow_negative_inventory,
                it.created_at AS it_created_at,
                it.updated_at AS it_updated_at,
                it.created_by AS it_created_by,
                it.updated_by AS it_updated_by,
                iu.id AS iu_id,
                iu.firstName AS iu_firstName,
                iu.lastName AS iu_lastName,
                iu.username AS iu_username
             FROM "production" p
             LEFT JOIN "production_item" pi ON pi.production_id = p.id
             LEFT JOIN "item" it ON it.id = pi.item_id
             LEFT JOIN "user" iu ON iu.id = pi.issued_by
             WHERE p.id = ?
             ORDER BY pi.created_at DESC`,
            [id],
        )) as Record<string, unknown>[];

        if (!rows.length) return null;

        const first = rows[0];
        const production = new Production();
        production.id = Number(first.id);
        production.name = String(first.name);
        production.description = first.description != null ? String(first.description) : null;
        production.status = first.status as ProductionStatus;
        production.created_by = first.created_by != null ? Number(first.created_by) : 0;
        production.updated_by = first.updated_by != null ? Number(first.updated_by) : 0;
        assignBaseEntityDates(production, first.created_at, first.updated_at);

        production.items = rows
            .filter((r) => r.pi_id != null)
            .map((r) => {
                const item = new ProductionItem();
                item.id = Number(r.pi_id);
                item.production_id = Number(r.pi_production_id);
                item.item_id = Number(r.pi_item_id);
                item.quantity_produced = Number(r.pi_quantity_produced);
                item.status = r.pi_status as any;
                item.issued_by = r.pi_issued_by != null ? Number(r.pi_issued_by) : null;
                item.issued_at = (r.pi_issued_at as Date) ?? null;
                item.notes = r.pi_notes != null ? String(r.pi_notes) : null;
                item.created_by = r.pi_created_by != null ? Number(r.pi_created_by) : 0;
                item.updated_by = r.pi_updated_by != null ? Number(r.pi_updated_by) : 0;
                assignBaseEntityDates(item, r.pi_created_at, r.pi_updated_at);
                item.item = r.it_id != null ? mapItemRowWithPrefix(r, "it") : ({ id: item.item_id } as any);
                item.issued_by_user = mapUserRowWithPrefix(r, "iu");
                return item;
            });

        return production;
    }
}

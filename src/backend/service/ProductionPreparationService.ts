import { ProductionPreparation, ProductionPreparationStatus } from "@backend/entities/ProductionPreparation";
import { Item } from "@backend/entities/Item";
import { User } from "@backend/entities/User";
import { InventoryService } from "./InventoryService";
import { DataSource, Repository } from "typeorm";
import {
    assignBaseEntityDates,
    mapItemRowWithPrefix,
    mapUserRowWithPrefix,
} from "@backend/utils/sqlEntityMappers";

export interface CreatePreparationInput {
    item_id: number;
    quantity_prepared: number;
    notes?: string;
    prepared_at?: Date;
    issued_at?: Date;
}

export interface PreparationFilters {
    item_id?: number;
    status?: ProductionPreparationStatus;
    prepared_by?: number;
    issued_by?: number;
    start_date?: Date;
    end_date?: Date;
}

export class ProductionPreparationService {
    private preparationRepository: Repository<ProductionPreparation>;
    private itemRepository: Repository<Item>;
    private userRepository: Repository<User>;
    private inventoryService: InventoryService;

    constructor(dataSource: DataSource) {
        this.preparationRepository = dataSource.getRepository(ProductionPreparation);
        this.itemRepository = dataSource.getRepository(Item);
        this.userRepository = dataSource.getRepository(User);
        this.inventoryService = new InventoryService(dataSource);
    }

    /**
     * Chef creates a preparation request
     */
    public async createPreparation(
        input: CreatePreparationInput,
        userId: number
    ): Promise<ProductionPreparation> {
        // Validate item exists
        const item = await this.itemRepository.findOne({
            where: { id: input.item_id },
        });

        if (!item) {
            throw new Error(`Item ${input.item_id} not found`);
        }

        if (item.isGroup) {
            throw new Error("Grouped/composite items cannot be issued directly. Please issue recipe components instead.");
        }

        // Validate quantity
        if (input.quantity_prepared <= 0) {
            throw new Error("Quantity prepared must be greater than 0");
        }

        // Validate user exists
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new Error(`User ${userId} not found`);
        }

        // Create preparation with PENDING status
        const preparation = this.preparationRepository.create({
            item: { id: input.item_id } as Item,
            quantity_prepared: input.quantity_prepared,
            status: ProductionPreparationStatus.PENDING,
            prepared_by_user: { id: userId } as User,
            prepared_at: new Date(),
            notes: input.notes || null,
            created_by: userId,
        });

        return await this.preparationRepository.save(preparation);
    }

    /**
     * Supervisor approves a preparation → issues to inventory
     */
    public async approvePreparation(
        preparationId: number,
        userId: number
    ): Promise<ProductionPreparation> {
        const preparation = await this.preparationRepository.findOne({
            where: { id: preparationId },
        });

        if (!preparation) {
            throw new Error(`Preparation ${preparationId} not found`);
        }

        if (preparation.status !== ProductionPreparationStatus.PENDING) {
            throw new Error(`Cannot approve preparation with status ${preparation.status}. Only pending preparations can be approved.`);
        }

        // Validate user exists
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new Error(`User ${userId} not found`);
        }

        // Update preparation status to ISSUED
        preparation.status = ProductionPreparationStatus.ISSUED;
        preparation.issued_by_user = user;
        preparation.issued_at = new Date();
        preparation.updated_by = userId;

        const savedPreparation = await this.preparationRepository.save(preparation);

        // Add produced items to inventory
        await this.inventoryService.addInventoryFromProduction(
            preparation.item_id,
            preparation.quantity_prepared,
            preparationId, // Use preparation ID as reference
            userId
        );

        return savedPreparation;
    }

    /**
     * Supervisor rejects a preparation
     */
    public async rejectPreparation(
        preparationId: number,
        userId: number,
        rejectionReason: string
    ): Promise<ProductionPreparation> {
        const preparation = await this.preparationRepository.findOne({
            where: { id: preparationId },
        });

        if (!preparation) {
            throw new Error(`Preparation ${preparationId} not found`);
        }

        if (preparation.status !== ProductionPreparationStatus.PENDING) {
            throw new Error(`Cannot reject preparation with status ${preparation.status}. Only pending preparations can be rejected.`);
        }

        // Validate user exists
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new Error(`User ${userId} not found`);
        }

        // Update preparation status to REJECTED
        preparation.status = ProductionPreparationStatus.REJECTED;
        preparation.rejection_reason = rejectionReason;
        preparation.updated_by = userId;

        return await this.preparationRepository.save(preparation);
    }

    /**
     * Supervisor issues production directly (bypasses chef preparation)
     */
    public async issueDirectly(
        input: CreatePreparationInput,
        userId: number
    ): Promise<ProductionPreparation> {
        // Validate item exists
        const item = await this.itemRepository.findOne({
            where: { id: input.item_id },
        });

        if (!item) {
            throw new Error(`Item ${input.item_id} not found`);
        }

        if (item.isGroup) {
            throw new Error("Grouped/composite items cannot be issued directly. Please issue recipe components instead.");
        }

        // Validate quantity
        if (input.quantity_prepared <= 0) {
            throw new Error("Quantity prepared must be greater than 0");
        }

        // Validate user exists
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new Error(`User ${userId} not found`);
        }

        // Use provided prepared_at date or default to current date
        // issued_at always uses current timestamp (when the issue actually happens)
        const preparedAt = input.prepared_at ? new Date(input.prepared_at) : new Date();
        const issuedAt = new Date(); // Always use current timestamp for issued_at

        // Create preparation with ISSUED status (directly issued)
        const preparation = this.preparationRepository.create({
            item: { id: input.item_id } as Item,
            quantity_prepared: input.quantity_prepared,
            status: ProductionPreparationStatus.ISSUED,
            prepared_by_user: { id: userId } as User,
            prepared_at: preparedAt,
            issued_by_user: { id: userId } as User,
            issued_at: issuedAt,
            notes: input.notes || null,
            created_by: userId,
        });

        const savedPreparation = await this.preparationRepository.save(preparation);

        // Add produced items to inventory
        await this.inventoryService.addInventoryFromProduction(
            input.item_id,
            input.quantity_prepared,
            savedPreparation.id,
            userId
        );

        return savedPreparation;
    }

    /**
     * Fetch preparations with filters (raw SQL — avoids TypeORM relation hydration issues on SQLite / standalone).
     */
    public async fetchPreparations(
        filters: PreparationFilters = {},
        limit: number = 100,
        offset: number = 0
    ): Promise<{ preparations: ProductionPreparation[]; total: number }> {
        const filterParams: unknown[] = [];
        const filterSql = ProductionPreparationService.buildPreparationFilterClause(filters, filterParams);

        const countRows = (await this.preparationRepository.manager.query(
            `SELECT COUNT(*) AS cnt FROM production_preparation prep WHERE 1 = 1${filterSql}`,
            filterParams,
        )) as Array<{ cnt: number | string }>;
        const total = Number(countRows[0]?.cnt ?? 0);

        const selectSql = `
      SELECT
        prep.id,
        prep.item_id,
        prep.quantity_prepared,
        prep.status,
        prep.prepared_by,
        prep.prepared_at,
        prep.issued_by,
        prep.issued_at,
        prep.notes,
        prep.rejection_reason,
        prep.created_at,
        prep.updated_at,
        prep.created_by,
        prep.updated_by,
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
        pu.id AS pu_id,
        pu.firstName AS pu_firstName,
        pu.lastName AS pu_lastName,
        pu.username AS pu_username,
        iu.id AS iu_id,
        iu.firstName AS iu_firstName,
        iu.lastName AS iu_lastName,
        iu.username AS iu_username
      FROM production_preparation prep
      LEFT JOIN item it ON it.id = prep.item_id
      LEFT JOIN user pu ON pu.id = prep.prepared_by
      LEFT JOIN user iu ON iu.id = prep.issued_by
      WHERE 1 = 1${filterSql}
      ORDER BY prep.prepared_at DESC, prep.created_at DESC
      LIMIT ? OFFSET ?
    `;

        const rows = (await this.preparationRepository.manager.query(selectSql, [
            ...filterParams,
            limit,
            offset,
        ])) as Record<string, unknown>[];

        const preparations = Array.isArray(rows)
            ? rows.map((row) => ProductionPreparationService.mapRowToProductionPreparation(row))
            : [];

        return { preparations, total };
    }

    private static buildPreparationFilterClause(
        filters: PreparationFilters,
        params: unknown[],
    ): string {
        const parts: string[] = [];
        if (filters.item_id != null) {
            parts.push("prep.item_id = ?");
            params.push(filters.item_id);
        }
        if (filters.status) {
            parts.push("prep.status = ?");
            params.push(filters.status);
        }
        if (filters.prepared_by != null) {
            parts.push("prep.prepared_by = ?");
            params.push(filters.prepared_by);
        }
        if (filters.issued_by != null) {
            parts.push("prep.issued_by = ?");
            params.push(filters.issued_by);
        }
        if (filters.start_date) {
            parts.push("prep.prepared_at >= ?");
            params.push(filters.start_date);
        }
        if (filters.end_date) {
            const endDate = new Date(filters.end_date);
            endDate.setHours(23, 59, 59, 999);
            parts.push("prep.prepared_at <= ?");
            params.push(endDate);
        }
        return parts.length ? ` AND ${parts.join(" AND ")}` : "";
    }

    private static mapRowToProductionPreparation(row: Record<string, unknown>): ProductionPreparation {
        const p = new ProductionPreparation();
        p.id = Number(row.id);
        p.item_id = Number(row.item_id);
        p.quantity_prepared = Number(row.quantity_prepared);
        p.status = row.status as ProductionPreparationStatus;
        p.prepared_by = row.prepared_by != null ? Number(row.prepared_by) : 0;
        p.prepared_at = (row.prepared_at as Date) ?? null;
        p.issued_by = row.issued_by == null ? null : Number(row.issued_by);
        p.issued_at = (row.issued_at as Date) ?? null;
        p.notes = row.notes != null ? String(row.notes) : null;
        p.rejection_reason = row.rejection_reason != null ? String(row.rejection_reason) : null;
        assignBaseEntityDates(p, row.created_at, row.updated_at);
        if (row.created_by != null) p.created_by = Number(row.created_by);
        if (row.updated_by != null) p.updated_by = Number(row.updated_by);

        p.item =
            row.it_id != null
                ? mapItemRowWithPrefix(row, "it")
                : ({ id: p.item_id } as Item);

        p.prepared_by_user = mapUserRowWithPrefix(row, "pu") ?? ({ id: p.prepared_by } as User);
        p.issued_by_user = mapUserRowWithPrefix(row, "iu");

        return p;
    }

    /**
     * Fetch a single preparation by ID
     */
    public async fetchPreparationById(id: number): Promise<ProductionPreparation | null> {
        const selectSql = `
      SELECT
        prep.id,
        prep.item_id,
        prep.quantity_prepared,
        prep.status,
        prep.prepared_by,
        prep.prepared_at,
        prep.issued_by,
        prep.issued_at,
        prep.notes,
        prep.rejection_reason,
        prep.created_at,
        prep.updated_at,
        prep.created_by,
        prep.updated_by,
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
        pu.id AS pu_id,
        pu.firstName AS pu_firstName,
        pu.lastName AS pu_lastName,
        pu.username AS pu_username,
        iu.id AS iu_id,
        iu.firstName AS iu_firstName,
        iu.lastName AS iu_lastName,
        iu.username AS iu_username
      FROM production_preparation prep
      LEFT JOIN item it ON it.id = prep.item_id
      LEFT JOIN user pu ON pu.id = prep.prepared_by
      LEFT JOIN user iu ON iu.id = prep.issued_by
      WHERE prep.id = ?
      LIMIT 1
    `;
        const rows = (await this.preparationRepository.manager.query(selectSql, [id])) as Record<
            string,
            unknown
        >[];
        if (!Array.isArray(rows) || rows.length === 0) {
            return null;
        }
        return ProductionPreparationService.mapRowToProductionPreparation(rows[0]);
    }
}


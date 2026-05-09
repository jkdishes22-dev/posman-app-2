import { ProductionIssue, ProductionIssueStatus } from "@backend/entities/ProductionIssue";
import { Item } from "@backend/entities/Item";
import { User } from "@backend/entities/User";
import { InventoryService } from "./InventoryService";
import { DataSource, Repository } from "typeorm";
import {
    assignBaseEntityDates,
    mapItemRowWithPrefix,
    mapUserRowWithPrefix,
} from "@backend/utils/sqlEntityMappers";

export interface CreateProductionIssueInput {
    item_id: number;
    quantity_produced: number;
    notes?: string;
}

export interface ProductionIssueFilters {
    item_id?: number;
    status?: ProductionIssueStatus;
    issued_by?: number;
    start_date?: Date;
    end_date?: Date;
}

export class ProductionIssueService {
    private productionIssueRepository: Repository<ProductionIssue>;
    private itemRepository: Repository<Item>;
    private inventoryService: InventoryService;

    constructor(dataSource: DataSource) {
        this.productionIssueRepository = dataSource.getRepository(ProductionIssue);
        this.itemRepository = dataSource.getRepository(Item);
        this.inventoryService = new InventoryService(dataSource);
    }

    /**
     * Create a new production issue
     * Adds produced items to inventory and creates inventory transaction
     */
    public async createProductionIssue(
        input: CreateProductionIssueInput,
        userId: number
    ): Promise<ProductionIssue> {
        // Validate item exists
        const item = await this.itemRepository.findOne({
            where: { id: input.item_id },
        });

        if (!item) {
            throw new Error(`Item ${input.item_id} not found`);
        }

        // Validate quantity
        if (input.quantity_produced <= 0) {
            throw new Error("Quantity produced must be greater than 0");
        }

        // Create production issue
        const productionIssue = this.productionIssueRepository.create({
            item_id: input.item_id,
            quantity_produced: input.quantity_produced,
            status: ProductionIssueStatus.COMPLETED, // Auto-complete on creation
            issued_by: userId,
            issued_at: new Date(),
            notes: input.notes || null,
            created_by: userId,
        });

        const savedIssue = await this.productionIssueRepository.save(productionIssue);

        // Add produced items to inventory — run outside the main save so a failure
        // here does not leave the production issue record in an ambiguous state.
        try {
            await this.inventoryService.addInventoryFromProduction(
                input.item_id,
                input.quantity_produced,
                savedIssue.id,
                userId
            );
        } catch (inventoryError) {
            console.error(`[ProductionIssueService] Inventory update failed for issue ${savedIssue.id}:`, inventoryError);
            // Re-throw so the controller can surface the error, but the issue record is already saved
            throw inventoryError;
        }

        return savedIssue;
    }

    /**
     * Fetch production issues with filters (raw SQL — stable on SQLite / standalone).
     */
    public async fetchProductionIssues(
        filters: ProductionIssueFilters = {},
        limit: number = 100,
        offset: number = 0
    ): Promise<{ issues: ProductionIssue[]; total: number }> {
        const filterParams: unknown[] = [];
        const filterSql = ProductionIssueService.buildIssueFilterClause(filters, filterParams);

        const countRows = (await this.productionIssueRepository.manager.query(
            `SELECT COUNT(*) AS cnt FROM production_issue iss WHERE 1 = 1${filterSql}`,
            filterParams,
        )) as Array<{ cnt: number | string }>;
        const total = Number(countRows[0]?.cnt ?? 0);

        const selectSql = `
      SELECT
        iss.id,
        iss.item_id,
        iss.quantity_produced,
        iss.status,
        iss.issued_by,
        iss.issued_at,
        iss.notes,
        iss.created_at,
        iss.updated_at,
        iss.created_by,
        iss.updated_by,
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
        u.id AS u_id,
        u.firstName AS u_firstName,
        u.lastName AS u_lastName,
        u.username AS u_username
      FROM production_issue iss
      LEFT JOIN item it ON it.id = iss.item_id
      LEFT JOIN user u ON u.id = iss.issued_by
      WHERE 1 = 1${filterSql}
      ORDER BY iss.issued_at DESC, iss.created_at DESC
      LIMIT ? OFFSET ?
    `;

        const rows = (await this.productionIssueRepository.manager.query(selectSql, [
            ...filterParams,
            limit,
            offset,
        ])) as Record<string, unknown>[];

        const issues = Array.isArray(rows) ? rows.map((r) => ProductionIssueService.mapRowToIssue(r)) : [];

        return { issues, total };
    }

    private static buildIssueFilterClause(filters: ProductionIssueFilters, params: unknown[]): string {
        const parts: string[] = [];
        if (filters.item_id != null) {
            parts.push("iss.item_id = ?");
            params.push(filters.item_id);
        }
        if (filters.status) {
            parts.push("iss.status = ?");
            params.push(filters.status);
        }
        if (filters.issued_by != null) {
            parts.push("iss.issued_by = ?");
            params.push(filters.issued_by);
        }
        if (filters.start_date) {
            const startDate = new Date(filters.start_date);
            if (!Number.isNaN(startDate.getTime())) {
                parts.push("iss.issued_at >= ?");
                params.push(startDate.toISOString());
            }
        }
        if (filters.end_date) {
            const endDate = new Date(filters.end_date);
            if (!Number.isNaN(endDate.getTime())) {
                endDate.setHours(23, 59, 59, 999);
                parts.push("iss.issued_at <= ?");
                params.push(endDate.toISOString());
            }
        }
        return parts.length ? ` AND ${parts.join(" AND ")}` : "";
    }

    private static mapRowToIssue(row: Record<string, unknown>): ProductionIssue {
        const iss = new ProductionIssue();
        iss.id = Number(row.id);
        iss.item_id = Number(row.item_id);
        iss.quantity_produced = Number(row.quantity_produced);
        iss.status = row.status as ProductionIssueStatus;
        (iss as { issued_by: number | null }).issued_by =
            row.issued_by == null ? null : Number(row.issued_by);
        iss.issued_at = (row.issued_at as Date) ?? null;
        iss.notes = row.notes != null ? String(row.notes) : "";
        assignBaseEntityDates(iss, row.created_at, row.updated_at);
        if (row.created_by != null) iss.created_by = Number(row.created_by);
        if (row.updated_by != null) iss.updated_by = Number(row.updated_by);

        iss.item =
            row.it_id != null ? mapItemRowWithPrefix(row, "it") : ({ id: iss.item_id } as Item);
        const issuer = mapUserRowWithPrefix(row, "u");
        const issuedId = row.issued_by == null ? null : Number(row.issued_by);
        iss.issued_by_user =
            issuer ??
            ({
                id: issuedId ?? 0,
                firstName: "",
                lastName: "",
                username: "",
            } as User);

        return iss;
    }

    /**
     * Fetch a single production issue by ID
     */
    public async fetchProductionIssueById(id: number): Promise<ProductionIssue | null> {
        const selectSql = `
      SELECT
        iss.id,
        iss.item_id,
        iss.quantity_produced,
        iss.status,
        iss.issued_by,
        iss.issued_at,
        iss.notes,
        iss.created_at,
        iss.updated_at,
        iss.created_by,
        iss.updated_by,
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
        u.id AS u_id,
        u.firstName AS u_firstName,
        u.lastName AS u_lastName,
        u.username AS u_username
      FROM production_issue iss
      LEFT JOIN item it ON it.id = iss.item_id
      LEFT JOIN user u ON u.id = iss.issued_by
      WHERE iss.id = ?
      LIMIT 1
    `;
        const rows = (await this.productionIssueRepository.manager.query(selectSql, [id])) as Record<
            string,
            unknown
        >[];
        if (!Array.isArray(rows) || rows.length === 0) return null;
        return ProductionIssueService.mapRowToIssue(rows[0]);
    }

    /**
     * Cancel a production issue (only if in DRAFT status)
     */
    public async cancelProductionIssue(issueId: number, userId: number): Promise<ProductionIssue> {
        const issue = await this.productionIssueRepository.findOne({
            where: { id: issueId },
        });

        if (!issue) {
            throw new Error(`Production issue ${issueId} not found`);
        }

        if (issue.status === ProductionIssueStatus.COMPLETED) {
            throw new Error("Cannot cancel a completed production issue");
        }

        issue.status = ProductionIssueStatus.CANCELLED;
        issue.updated_by = userId;

        return await this.productionIssueRepository.save(issue);
    }
}


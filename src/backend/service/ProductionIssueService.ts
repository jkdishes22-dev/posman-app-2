import { ProductionIssue, ProductionIssueStatus } from "@backend/entities/ProductionIssue";
import { Item } from "@backend/entities/Item";
import { InventoryService } from "./InventoryService";
import { DataSource, Repository } from "typeorm";

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
     * Fetch production issues with filters
     */
    public async fetchProductionIssues(
        filters: ProductionIssueFilters = {},
        limit: number = 100,
        offset: number = 0
    ): Promise<{ issues: ProductionIssue[]; total: number }> {
        const queryBuilder = this.productionIssueRepository
            .createQueryBuilder("issue")
            .leftJoinAndSelect("issue.item", "item")
            .leftJoinAndSelect("issue.issued_by_user", "user");

        if (filters.item_id) {
            queryBuilder.andWhere("issue.item_id = :item_id", { item_id: filters.item_id });
        }

        if (filters.status) {
            queryBuilder.andWhere("issue.status = :status", { status: filters.status });
        }

        if (filters.issued_by) {
            queryBuilder.andWhere("issue.issued_by = :issued_by", { issued_by: filters.issued_by });
        }

        if (filters.start_date) {
            queryBuilder.andWhere("issue.issued_at >= :start_date", { start_date: filters.start_date });
        }

        if (filters.end_date) {
            queryBuilder.andWhere("issue.issued_at <= :end_date", { end_date: filters.end_date });
        }

        queryBuilder
            .orderBy("issue.issued_at", "DESC")
            .addOrderBy("issue.created_at", "DESC")
            .skip(offset)
            .take(limit);

        const [issues, total] = await queryBuilder.getManyAndCount();

        return { issues, total };
    }

    /**
     * Fetch a single production issue by ID
     */
    public async fetchProductionIssueById(id: number): Promise<ProductionIssue | null> {
        return await this.productionIssueRepository.findOne({
            where: { id },
            relations: ["item", "issued_by_user"],
        });
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


import { ProductionPreparation, ProductionPreparationStatus } from "@backend/entities/ProductionPreparation";
import { Item } from "@backend/entities/Item";
import { User } from "@backend/entities/User";
import { InventoryService } from "./InventoryService";
import { DataSource, Repository } from "typeorm";

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
            item_id: input.item_id,
            quantity_prepared: input.quantity_prepared,
            status: ProductionPreparationStatus.PENDING,
            prepared_by: userId,
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
            relations: ["item"],
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
        preparation.issued_by = userId;
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
            item_id: input.item_id,
            quantity_prepared: input.quantity_prepared,
            status: ProductionPreparationStatus.ISSUED,
            prepared_by: userId, // Supervisor is both preparer and issuer
            prepared_at: preparedAt,
            issued_by: userId,
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
     * Fetch preparations with filters
     */
    public async fetchPreparations(
        filters: PreparationFilters = {},
        limit: number = 100,
        offset: number = 0
    ): Promise<{ preparations: ProductionPreparation[]; total: number }> {
        const queryBuilder = this.preparationRepository
            .createQueryBuilder("prep")
            .leftJoinAndSelect("prep.item", "item")
            .leftJoinAndSelect("prep.prepared_by_user", "prepared_by_user")
            .leftJoinAndSelect("prep.issued_by_user", "issued_by_user");

        if (filters.item_id) {
            queryBuilder.andWhere("prep.item_id = :item_id", { item_id: filters.item_id });
        }

        if (filters.status) {
            queryBuilder.andWhere("prep.status = :status", { status: filters.status });
        }

        if (filters.prepared_by) {
            queryBuilder.andWhere("prep.prepared_by = :prepared_by", { prepared_by: filters.prepared_by });
        }

        if (filters.issued_by) {
            queryBuilder.andWhere("prep.issued_by = :issued_by", { issued_by: filters.issued_by });
        }

        if (filters.start_date) {
            queryBuilder.andWhere("prep.prepared_at >= :start_date", { start_date: filters.start_date });
        }

        if (filters.end_date) {
            // Set end_date to end of day for inclusive date range
            const endDate = new Date(filters.end_date);
            endDate.setHours(23, 59, 59, 999);
            queryBuilder.andWhere("prep.prepared_at <= :end_date", { end_date: endDate });
        }

        queryBuilder
            .orderBy("prep.prepared_at", "DESC")
            .addOrderBy("prep.created_at", "DESC")
            .skip(offset)
            .take(limit);

        const [preparations, total] = await queryBuilder.getManyAndCount();

        return { preparations, total };
    }

    /**
     * Fetch a single preparation by ID
     */
    public async fetchPreparationById(id: number): Promise<ProductionPreparation | null> {
        return await this.preparationRepository.findOne({
            where: { id },
            relations: ["item", "prepared_by_user", "issued_by_user"],
        });
    }
}


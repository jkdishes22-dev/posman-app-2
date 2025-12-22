import { Inventory } from "@backend/entities/Inventory";
import { InventoryTransaction, InventoryTransactionType, InventoryReferenceType } from "@backend/entities/InventoryTransaction";
import { Item } from "@backend/entities/Item";
import { Bill, BillStatus } from "@backend/entities/Bill";
import { BillItem } from "@backend/entities/BillItem";
import { DataSource, Repository } from "typeorm";

export interface InventoryLevel {
    item_id: number;
    quantity: number;
    reserved_quantity: number;
    available_quantity: number; // quantity - reserved_quantity
    min_stock_level: number | null;
    max_stock_level: number | null;
    reorder_point: number | null;
    is_low_stock: boolean;
}

export interface LowStockItem extends InventoryLevel {
    item: Item;
}

export class InventoryService {
    private inventoryRepository: Repository<Inventory>;
    private inventoryTransactionRepository: Repository<InventoryTransaction>;
    private billRepository: Repository<Bill>;

    constructor(dataSource: DataSource) {
        this.inventoryRepository = dataSource.getRepository(Inventory);
        this.inventoryTransactionRepository = dataSource.getRepository(InventoryTransaction);
        this.billRepository = dataSource.getRepository(Bill);
    }

    /**
     * Initialize inventory for an item
     */
    public async initializeInventory(
        itemId: number,
        initialQuantity: number = 0,
        minLevel: number | null = null,
        maxLevel: number | null = null,
        reorderPoint: number | null = null,
        userId: number
    ): Promise<Inventory> {
        // Check if inventory already exists
        const existing = await this.inventoryRepository.findOne({
            where: { item_id: itemId },
        });

        if (existing) {
            throw new Error(`Inventory already exists for item ${itemId}`);
        }

        const inventory = this.inventoryRepository.create({
            item_id: itemId,
            quantity: initialQuantity,
            reserved_quantity: 0,
            min_stock_level: minLevel,
            max_stock_level: maxLevel,
            reorder_point: reorderPoint,
            created_by: userId,
        });

        return await this.inventoryRepository.save(inventory);
    }

    /**
     * Get current inventory level for an item
     */
    public async getInventoryLevel(itemId: number): Promise<InventoryLevel | null> {
        const inventory = await this.inventoryRepository.findOne({
            where: { item_id: itemId },
        });

        if (!inventory) {
            return null;
        }

        const available_quantity = inventory.quantity - inventory.reserved_quantity;
        const is_low_stock = inventory.reorder_point !== null
            ? available_quantity <= inventory.reorder_point
            : false;

        return {
            item_id: inventory.item_id,
            quantity: inventory.quantity,
            reserved_quantity: inventory.reserved_quantity,
            available_quantity,
            min_stock_level: inventory.min_stock_level,
            max_stock_level: inventory.max_stock_level,
            reorder_point: inventory.reorder_point,
            is_low_stock,
        };
    }

    /**
     * Get available stock (quantity - reserved_quantity)
     */
    public async getAvailableStock(itemId: number): Promise<number> {
        const inventory = await this.inventoryRepository.findOne({
            where: { item_id: itemId },
        });

        if (!inventory) {
            return 0;
        }

        return Math.max(0, inventory.quantity - inventory.reserved_quantity);
    }

    /**
     * Reserve inventory for a bill (Phase 1: Reservation)
     * Called when bill is created (DRAFT status)
     */
    public async reserveInventoryForBill(billId: number, userId: number): Promise<void> {
        const bill = await this.billRepository.findOne({
            where: { id: billId },
            relations: ["bill_items", "bill_items.item"],
        });

        if (!bill) {
            throw new Error(`Bill ${billId} not found`);
        }

        if (bill.status !== BillStatus.PENDING) {
            throw new Error(`Cannot reserve inventory for bill ${billId} with status ${bill.status}`);
        }

        // Use transaction to ensure atomicity
        await this.inventoryRepository.manager.transaction(async (transactionalEntityManager) => {
            for (const billItem of bill.bill_items || []) {
                const item = billItem.item;

                // Only reserve for stock items
                if (!item || !item.isStock) {
                    continue;
                }

                // Get or create inventory record
                let inventory = await transactionalEntityManager.findOne(Inventory, {
                    where: { item_id: item.id },
                });

                if (!inventory) {
                    // Initialize inventory with 0 quantity if it doesn't exist
                    inventory = transactionalEntityManager.create(Inventory, {
                        item_id: item.id,
                        quantity: 0,
                        reserved_quantity: 0,
                        created_by: userId,
                    });
                    inventory = await transactionalEntityManager.save(Inventory, inventory);
                }

                // Check available stock
                const availableStock = inventory.quantity - inventory.reserved_quantity;
                if (availableStock < billItem.quantity) {
                    throw new Error(
                        `Insufficient stock for item ${item.name}. Available: ${availableStock}, Required: ${billItem.quantity}`
                    );
                }

                // Reserve the quantity
                inventory.reserved_quantity += billItem.quantity;
                inventory.updated_by = userId;
                // updated_at is automatically managed by TypeORM's UpdateDateColumn

                await transactionalEntityManager.save(Inventory, inventory);

                // Create transaction record for reservation
                const transaction = transactionalEntityManager.create(InventoryTransaction, {
                    item_id: item.id,
                    transaction_type: InventoryTransactionType.SALE,
                    quantity: -billItem.quantity, // Negative for reservation (not yet deducted)
                    reference_type: InventoryReferenceType.BILL,
                    reference_id: billId,
                    notes: `Reserved for bill ${billId}`,
                    created_by: userId,
                });
                await transactionalEntityManager.save(InventoryTransaction, transaction);
            }
        });
    }

    /**
     * Convert reservation to actual deduction (Phase 2: Deduction)
     * Called when bill is submitted (SUBMITTED status)
     */
    public async deductInventoryForSale(billId: number, userId: number): Promise<void> {
        const bill = await this.billRepository.findOne({
            where: { id: billId },
            relations: ["bill_items", "bill_items.item"],
        });

        if (!bill) {
            throw new Error(`Bill ${billId} not found`);
        }

        if (bill.status !== BillStatus.SUBMITTED) {
            throw new Error(`Cannot deduct inventory for bill ${billId} with status ${bill.status}`);
        }

        // Use transaction to ensure atomicity
        await this.inventoryRepository.manager.transaction(async (transactionalEntityManager) => {
            for (const billItem of bill.bill_items || []) {
                const item = billItem.item;

                // Only deduct for stock items
                if (!item || !item.isStock) {
                    continue;
                }

                const inventory = await transactionalEntityManager.findOne(Inventory, {
                    where: { item_id: item.id },
                });

                if (!inventory) {
                    throw new Error(`Inventory not found for item ${item.id}`);
                }

                // Check if quantity was reserved
                if (inventory.reserved_quantity < billItem.quantity) {
                    throw new Error(
                        `Reserved quantity mismatch for item ${item.id}. Reserved: ${inventory.reserved_quantity}, Required: ${billItem.quantity}`
                    );
                }

                // Convert reservation to deduction: decrease both quantity and reserved_quantity
                inventory.quantity -= billItem.quantity;
                inventory.reserved_quantity -= billItem.quantity;
                inventory.updated_by = userId;
                // updated_at is automatically managed by TypeORM's UpdateDateColumn

                await transactionalEntityManager.save(Inventory, inventory);

                // Create transaction record for deduction
                const transaction = transactionalEntityManager.create(InventoryTransaction, {
                    item_id: item.id,
                    transaction_type: InventoryTransactionType.SALE,
                    quantity: -billItem.quantity, // Negative for deduction
                    reference_type: InventoryReferenceType.BILL,
                    reference_id: billId,
                    notes: `Deducted for bill ${billId}`,
                    created_by: userId,
                });
                await transactionalEntityManager.save(InventoryTransaction, transaction);
            }
        });
    }

    /**
     * Release inventory reservation
     * Called when bill is cancelled/deleted (DRAFT status only)
     */
    public async releaseInventoryReservation(billId: number, userId: number): Promise<void> {
        const bill = await this.billRepository.findOne({
            where: { id: billId },
            relations: ["bill_items", "bill_items.item"],
        });

        if (!bill) {
            throw new Error(`Bill ${billId} not found`);
        }

        // Only release if bill is still in DRAFT/PENDING status
        if (bill.status !== BillStatus.PENDING) {
            // Bill already submitted, reservation already converted to deduction
            return;
        }

        // Use transaction to ensure atomicity
        await this.inventoryRepository.manager.transaction(async (transactionalEntityManager) => {
            for (const billItem of bill.bill_items || []) {
                const item = billItem.item;

                // Only release for stock items
                if (!item || !item.isStock) {
                    continue;
                }

                const inventory = await transactionalEntityManager.findOne(Inventory, {
                    where: { item_id: item.id },
                });

                if (!inventory) {
                    continue; // Inventory doesn't exist, skip
                }

                // Release the reserved quantity
                if (inventory.reserved_quantity >= billItem.quantity) {
                    inventory.reserved_quantity -= billItem.quantity;
                    inventory.updated_by = userId;
                    // updated_at is automatically managed by TypeORM's UpdateDateColumn
                    await transactionalEntityManager.save(Inventory, inventory);

                    // Create transaction record for release
                    const transaction = transactionalEntityManager.create(InventoryTransaction, {
                        item_id: item.id,
                        transaction_type: InventoryTransactionType.ADJUSTMENT,
                        quantity: billItem.quantity, // Positive for release
                        reference_type: InventoryReferenceType.BILL,
                        reference_id: billId,
                        notes: `Released reservation for cancelled bill ${billId}`,
                        created_by: userId,
                    });
                    await transactionalEntityManager.save(InventoryTransaction, transaction);
                }
            }
        });
    }

    /**
     * Check for low stock items
     */
    public async checkLowStock(): Promise<LowStockItem[]> {
        const inventories = await this.inventoryRepository
            .createQueryBuilder("inventory")
            .leftJoinAndSelect("inventory.item", "item")
            .where("inventory.reorder_point IS NOT NULL")
            .getMany();

        const lowStockItems: LowStockItem[] = [];

        for (const inventory of inventories) {
            const available_quantity = inventory.quantity - inventory.reserved_quantity;

            if (inventory.reorder_point !== null && available_quantity <= inventory.reorder_point) {
                lowStockItems.push({
                    item_id: inventory.item_id,
                    quantity: inventory.quantity,
                    reserved_quantity: inventory.reserved_quantity,
                    available_quantity,
                    min_stock_level: inventory.min_stock_level,
                    max_stock_level: inventory.max_stock_level,
                    reorder_point: inventory.reorder_point,
                    is_low_stock: true,
                    item: inventory.item,
                });
            }
        }

        return lowStockItems;
    }

    /**
     * Get reorder suggestions based on low stock
     */
    public async getReorderSuggestions(): Promise<Array<{
        item: Item;
        current_stock: number;
        reorder_point: number;
        suggested_quantity: number;
    }>> {
        const lowStockItems = await this.checkLowStock();

        return lowStockItems.map((item) => ({
            item: item.item,
            current_stock: item.available_quantity,
            reorder_point: item.reorder_point!,
            suggested_quantity: item.max_stock_level
                ? item.max_stock_level - item.available_quantity
                : item.reorder_point! * 2, // Default: order 2x reorder point
        }));
    }

    /**
     * Get inventory transaction history for an item
     */
    public async getInventoryHistory(
        itemId: number,
        limit: number = 100
    ): Promise<InventoryTransaction[]> {
        return await this.inventoryTransactionRepository
            .createQueryBuilder("transaction")
            .where("transaction.item_id = :itemId", { itemId })
            .orderBy("transaction.created_at", "DESC")
            .limit(limit)
            .getMany();
    }

    /**
     * Manual inventory adjustment
     */
    public async adjustInventory(
        itemId: number,
        newQuantity: number,
        reason: string,
        userId: number
    ): Promise<Inventory> {
        const inventory = await this.inventoryRepository.findOne({
            where: { item_id: itemId },
        });

        if (!inventory) {
            throw new Error(`Inventory not found for item ${itemId}`);
        }

        const quantityDifference = newQuantity - inventory.quantity;

        // Update inventory
        inventory.quantity = newQuantity;
        inventory.updated_by = userId;
        // updated_at is automatically managed by TypeORM's UpdateDateColumn
        await this.inventoryRepository.save(inventory);

        // Create transaction record
        const transaction = this.inventoryTransactionRepository.create({
            item_id: itemId,
            transaction_type: InventoryTransactionType.ADJUSTMENT,
            quantity: quantityDifference, // Positive for increase, negative for decrease
            reference_type: InventoryReferenceType.MANUAL_ADJUSTMENT,
            reference_id: null,
            notes: reason,
            created_by: userId,
        });
        await this.inventoryTransactionRepository.save(transaction);

        return inventory;
    }

    /**
     * Add inventory from purchase order receiving
     */
    public async addInventoryFromPurchase(
        itemId: number,
        quantity: number,
        purchaseOrderId: number,
        userId: number
    ): Promise<Inventory> {
        // Get or create inventory
        let inventory = await this.inventoryRepository.findOne({
            where: { item_id: itemId },
        });

        if (!inventory) {
            inventory = this.inventoryRepository.create({
                item_id: itemId,
                quantity: 0,
                reserved_quantity: 0,
                created_by: userId,
            });
        }

        // Add quantity
        inventory.quantity += quantity;
        inventory.last_restocked_at = new Date();
        inventory.updated_by = userId;
        // updated_at is automatically managed by TypeORM's UpdateDateColumn
        await this.inventoryRepository.save(inventory);

        // Create transaction record
        const transaction = this.inventoryTransactionRepository.create({
            item_id: itemId,
            transaction_type: InventoryTransactionType.PURCHASE,
            quantity: quantity, // Positive for addition
            reference_type: InventoryReferenceType.PURCHASE_ORDER,
            reference_id: purchaseOrderId,
            notes: `Received from purchase order ${purchaseOrderId}`,
            created_by: userId,
        });
        await this.inventoryTransactionRepository.save(transaction);

        return inventory;
    }
}


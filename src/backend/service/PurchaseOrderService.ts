import { PurchaseOrder, PurchaseOrderStatus } from "@backend/entities/PurchaseOrder";
import { PurchaseOrderItem } from "@backend/entities/PurchaseOrderItem";
import { Supplier } from "@backend/entities/Supplier";
import { Item } from "@backend/entities/Item";
import { SupplierTransaction, SupplierTransactionType, SupplierReferenceType } from "@backend/entities/SupplierTransaction";
import { InventoryService } from "./InventoryService";
import { SupplierService } from "./SupplierService";
import { DataSource, Repository } from "typeorm";

export interface PurchaseOrderItemInput {
    item_id: number;
    quantity_ordered: number;
    unit_price: number;
}

export interface CreatePurchaseOrderInput {
    supplier_id: number;
    items: PurchaseOrderItemInput[];
    expected_delivery_date?: Date;
    notes?: string;
}

export interface ReceivePurchaseOrderInput {
    items: Array<{
        item_id: number;
        quantity_received: number;
    }>;
}

export class PurchaseOrderService {
    private purchaseOrderRepository: Repository<PurchaseOrder>;
    private purchaseOrderItemRepository: Repository<PurchaseOrderItem>;
    private supplierRepository: Repository<Supplier>;
    private inventoryService: InventoryService;
    private supplierService: SupplierService;

    constructor(dataSource: DataSource) {
        this.purchaseOrderRepository = dataSource.getRepository(PurchaseOrder);
        this.purchaseOrderItemRepository = dataSource.getRepository(PurchaseOrderItem);
        this.supplierRepository = dataSource.getRepository(Supplier);
        this.inventoryService = new InventoryService(dataSource);
        this.supplierService = new SupplierService(dataSource);
    }

    /**
     * Generate unique PO number (format: PO-YYYYMMDD-XXX)
     */
    private async generatePONumber(): Promise<string> {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
        const prefix = `PO-${dateStr}-`;

        // Find the last PO number for today
        const lastPO = await this.purchaseOrderRepository
            .createQueryBuilder("po")
            .where("po.order_number LIKE :prefix", { prefix: `${prefix}%` })
            .orderBy("po.order_number", "DESC")
            .getOne();

        let sequence = 1;
        if (lastPO) {
            const lastSequence = parseInt(lastPO.order_number.slice(-3));
            sequence = lastSequence + 1;
        }

        const sequenceStr = sequence.toString().padStart(3, "0");
        return `${prefix}${sequenceStr}`;
    }

    /**
     * Create a new purchase order
     */
    public async createPurchaseOrder(
        input: CreatePurchaseOrderInput,
        userId: number
    ): Promise<PurchaseOrder> {
        // Validate supplier exists
        const supplier = await this.supplierRepository.findOne({
            where: { id: input.supplier_id },
        });

        if (!supplier) {
            throw new Error(`Supplier ${input.supplier_id} not found`);
        }

        // Check supplier credit limit (only if credit_limit > 0)
        const balance = await this.supplierService.getSupplierBalance(input.supplier_id);
        const totalAmount = input.items.reduce(
            (sum, item) => sum + item.quantity_ordered * item.unit_price,
            0
        );

        // Only enforce credit limit if supplier has a credit limit set (> 0)
        // This allows creating POs for suppliers without credit limits (cash on delivery, etc.)
        if (supplier.credit_limit > 0 && balance.available_credit < totalAmount) {
            throw new Error(
                `Purchase order amount (${totalAmount}) exceeds available credit (${balance.available_credit}). Credit limit: ${supplier.credit_limit}`
            );
        }

        // Generate PO number
        const orderNumber = await this.generatePONumber();

        // Use transaction to ensure atomicity
        return await this.purchaseOrderRepository.manager.transaction(
            async (transactionalEntityManager) => {
                // Create purchase order
                const purchaseOrder = transactionalEntityManager.create(PurchaseOrder, {
                    supplier_id: input.supplier_id,
                    order_number: orderNumber,
                    order_date: new Date(),
                    expected_delivery_date: input.expected_delivery_date || null,
                    status: PurchaseOrderStatus.DRAFT,
                    total_amount: totalAmount,
                    notes: input.notes || null,
                    created_by: userId,
                });

                const savedPO = await transactionalEntityManager.save(PurchaseOrder, purchaseOrder);

                // Create purchase order items
                const poItems = input.items.map((item) => {
                    const subtotal = item.quantity_ordered * item.unit_price;
                    return transactionalEntityManager.create(PurchaseOrderItem, {
                        purchase_order_id: savedPO.id,
                        item_id: item.item_id,
                        quantity_ordered: item.quantity_ordered,
                        quantity_received: 0,
                        unit_price: item.unit_price,
                        subtotal,
                        created_by: userId,
                    });
                });

                await transactionalEntityManager.save(PurchaseOrderItem, poItems);

                // Create supplier transaction (increases debit_balance)
                await this.supplierService.createSupplierTransaction(
                    input.supplier_id,
                    SupplierTransactionType.PURCHASE_ORDER,
                    totalAmount, // debit_amount
                    0, // credit_amount
                    SupplierReferenceType.PURCHASE_ORDER,
                    savedPO.id,
                    `Purchase order ${orderNumber}`,
                    userId
                );

                // Fetch complete PO with items
                const completePO = await transactionalEntityManager.findOne(PurchaseOrder, {
                    where: { id: savedPO.id },
                    relations: ["items", "items.item", "supplier"],
                });

                return completePO!;
            }
        );
    }

    /**
     * Update purchase order (only if in DRAFT status)
     */
    public async updatePurchaseOrder(
        poId: number,
        data: Partial<{
            expected_delivery_date: Date;
            notes: string;
            items: PurchaseOrderItemInput[];
        }>,
        userId: number
    ): Promise<PurchaseOrder> {
        const po = await this.purchaseOrderRepository.findOne({
            where: { id: poId },
            relations: ["items"],
        });

        if (!po) {
            throw new Error(`Purchase order ${poId} not found`);
        }

        if (po.status !== PurchaseOrderStatus.DRAFT) {
            throw new Error(`Cannot update purchase order ${poId} with status ${po.status}`);
        }

        // Update basic fields
        if (data.expected_delivery_date !== undefined) {
            po.expected_delivery_date = data.expected_delivery_date;
        }
        if (data.notes !== undefined) {
            po.notes = data.notes;
        }

        // Update items if provided
        if (data.items) {
            // Delete existing items
            await this.purchaseOrderItemRepository.delete({ purchase_order_id: poId });

            // Create new items
            const newItems = data.items.map((item) => {
                const subtotal = item.quantity_ordered * item.unit_price;
                return this.purchaseOrderItemRepository.create({
                    purchase_order_id: poId,
                    item_id: item.item_id,
                    quantity_ordered: item.quantity_ordered,
                    quantity_received: 0,
                    unit_price: item.unit_price,
                    subtotal,
                    created_by: userId,
                });
            });

            await this.purchaseOrderItemRepository.save(newItems);

            // Recalculate total
            const totalAmount = data.items.reduce(
                (sum, item) => sum + item.quantity_ordered * item.unit_price,
                0
            );
            po.total_amount = totalAmount;

            // Update supplier transaction
            // Note: This is simplified - in production, you might want to update the transaction
            // or create a reversal and new transaction
        }

        po.updated_by = userId;
        // updated_at is automatically managed by TypeORM's UpdateDateColumn
        await this.purchaseOrderRepository.save(po);

        return await this.purchaseOrderRepository.findOne({
            where: { id: poId },
            relations: ["items", "items.item", "supplier"],
        })!;
    }

    /**
     * Fetch purchase orders with filters
     */
    public async fetchPurchaseOrders(filters: {
        status?: PurchaseOrderStatus | PurchaseOrderStatus[];
        supplier_id?: number;
        start_date?: Date;
        end_date?: Date;
        limit?: number;
    }): Promise<PurchaseOrder[]> {
        const query = this.purchaseOrderRepository
            .createQueryBuilder("po")
            .leftJoinAndSelect("po.items", "items")
            .leftJoinAndSelect("items.item", "item")
            .leftJoinAndSelect("po.supplier", "supplier");

        if (filters.status) {
            if (Array.isArray(filters.status)) {
                query.andWhere("po.status IN (:...statuses)", { statuses: filters.status });
            } else {
                query.andWhere("po.status = :status", { status: filters.status });
            }
        }

        if (filters.supplier_id) {
            query.andWhere("po.supplier_id = :supplierId", { supplierId: filters.supplier_id });
        }

        if (filters.start_date) {
            query.andWhere("po.order_date >= :startDate", { startDate: filters.start_date });
        }

        if (filters.end_date) {
            query.andWhere("po.order_date <= :endDate", { endDate: filters.end_date });
        }

        query.orderBy("po.order_date", "DESC");

        if (filters.limit) {
            query.limit(filters.limit);
        }

        return await query.getMany();
    }

    /**
     * Fetch purchase order by ID
     */
    public async fetchPurchaseOrderById(id: number): Promise<PurchaseOrder | null> {
        return await this.purchaseOrderRepository.findOne({
            where: { id },
            relations: ["items", "items.item", "supplier"],
        });
    }

    /**
     * Receive goods from purchase order (partial receiving supported)
     */
    public async receivePurchaseOrder(
        poId: number,
        input: ReceivePurchaseOrderInput,
        userId: number
    ): Promise<PurchaseOrder> {
        const po = await this.purchaseOrderRepository.findOne({
            where: { id: poId },
            relations: ["items", "items.item", "supplier"],
        });

        if (!po) {
            throw new Error(`Purchase order ${poId} not found`);
        }

        if (po.status === PurchaseOrderStatus.CANCELLED) {
            throw new Error(`Cannot receive cancelled purchase order ${poId}`);
        }

        if (po.status === PurchaseOrderStatus.RECEIVED) {
            throw new Error(`Purchase order ${poId} already fully received`);
        }

        // Use transaction to ensure atomicity
        return await this.purchaseOrderRepository.manager.transaction(
            async (transactionalEntityManager) => {
                let allReceived = true;
                let anyReceived = false;

                // Process each received item
                for (const receivedItem of input.items) {
                    const poItem = po.items.find((item) => item.item_id === receivedItem.item_id);

                    if (!poItem) {
                        throw new Error(`Item ${receivedItem.item_id} not found in purchase order ${poId}`);
                    }

                    const remainingToReceive = poItem.quantity_ordered - poItem.quantity_received;

                    if (receivedItem.quantity_received > remainingToReceive) {
                        throw new Error(
                            `Cannot receive ${receivedItem.quantity_received} of item ${receivedItem.item_id}. ` +
                            `Only ${remainingToReceive} remaining to receive.`
                        );
                    }

                    // Update received quantity
                    poItem.quantity_received += receivedItem.quantity_received;
                    await transactionalEntityManager.save(PurchaseOrderItem, poItem);

                    // Add inventory
                    const item = poItem.item;
                    if (item && item.isStock) {
                        await this.inventoryService.addInventoryFromPurchase(
                            item.id,
                            receivedItem.quantity_received,
                            poId,
                            userId
                        );
                    }

                    if (poItem.quantity_received < poItem.quantity_ordered) {
                        allReceived = false;
                    }
                    if (receivedItem.quantity_received > 0) {
                        anyReceived = true;
                    }
                }

                if (!anyReceived) {
                    throw new Error("No items received");
                }

                // Update PO status
                if (allReceived) {
                    po.status = PurchaseOrderStatus.RECEIVED;
                } else {
                    po.status = PurchaseOrderStatus.PARTIAL;
                }

                po.updated_by = userId;
                // updated_at is automatically managed by TypeORM's UpdateDateColumn
                await transactionalEntityManager.save(PurchaseOrder, po);

                return await transactionalEntityManager.findOne(PurchaseOrder, {
                    where: { id: poId },
                    relations: ["items", "items.item", "supplier"],
                })!;
            }
        );
    }

    /**
     * Cancel purchase order
     */
    public async cancelPurchaseOrder(poId: number, userId: number): Promise<PurchaseOrder> {
        const po = await this.purchaseOrderRepository.findOne({
            where: { id: poId },
            relations: ["items"],
        });

        if (!po) {
            throw new Error(`Purchase order ${poId} not found`);
        }

        if (po.status === PurchaseOrderStatus.RECEIVED) {
            throw new Error(`Cannot cancel fully received purchase order ${poId}`);
        }

        if (po.status === PurchaseOrderStatus.CANCELLED) {
            return po; // Already cancelled
        }

        // Use transaction to ensure atomicity
        return await this.purchaseOrderRepository.manager.transaction(
            async (transactionalEntityManager) => {
                // Update status
                po.status = PurchaseOrderStatus.CANCELLED;
                po.updated_by = userId;
                // updated_at is automatically managed by TypeORM's UpdateDateColumn
                await transactionalEntityManager.save(PurchaseOrder, po);

                // Reverse supplier transaction (decrease debit_balance)
                await this.supplierService.createSupplierTransaction(
                    po.supplier_id,
                    SupplierTransactionType.PURCHASE_ORDER,
                    -po.total_amount, // Negative to reverse
                    0,
                    SupplierReferenceType.PURCHASE_ORDER,
                    poId,
                    `Cancelled purchase order ${po.order_number}`,
                    userId
                );

                return await transactionalEntityManager.findOne(PurchaseOrder, {
                    where: { id: poId },
                    relations: ["items", "items.item", "supplier"],
                })!;
            }
        );
    }
}


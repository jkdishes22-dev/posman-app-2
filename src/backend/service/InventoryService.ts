import { Inventory } from "@backend/entities/Inventory";
import { InventoryTransaction, InventoryTransactionType, InventoryReferenceType } from "@backend/entities/InventoryTransaction";
import { Item } from "@backend/entities/Item";
import { Bill, BillStatus } from "@backend/entities/Bill";
import { BillItem, BillItemStatus } from "@backend/entities/BillItem";
import { ItemGroup } from "@backend/entities/ItemGroup";
import { DataSource, Repository } from "typeorm";
import { cache } from "@backend/utils/cache";
import { mapItemRowWithPrefix } from "@backend/utils/sqlEntityMappers";

export interface InventoryLevel {
    item_id: number;
    quantity: number;
    available_quantity: number; // same as quantity
    min_stock_level: number | null;
    max_stock_level: number | null;
    reorder_point: number | null;
    is_low_stock: boolean;
}

export interface LowStockItem extends InventoryLevel {
    item: Item;
}

/** Options for {@link InventoryService.getAvailableInventoryForItems}. */
export interface AvailableInventoryOptions {
    /** Exclude this bill's lines when subtracting other users' pending-bill demand (editing an open bill). */
    excludeBillId?: number;
}

export class InventoryService {
    private inventoryRepository: Repository<Inventory>;
    private inventoryTransactionRepository: Repository<InventoryTransaction>;
    private billRepository: Repository<Bill>;
    private itemGroupRepository: Repository<ItemGroup>;

    constructor(dataSource: DataSource) {
        this.inventoryRepository = dataSource.getRepository(Inventory);
        this.inventoryTransactionRepository = dataSource.getRepository(InventoryTransaction);
        this.billRepository = dataSource.getRepository(Bill);
        this.itemGroupRepository = dataSource.getRepository(ItemGroup);
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
            where: { item: { id: itemId } },
        });

        if (existing) {
            throw new Error(`Inventory already exists for item ${itemId}`);
        }

        const inventory = this.inventoryRepository.create({
            item: { id: itemId } as Item,
            quantity: initialQuantity,
            min_stock_level: minLevel,
            max_stock_level: maxLevel,
            reorder_point: reorderPoint,
            created_by: userId,
        });

        const saved = await this.inventoryRepository.save(inventory);

        // Invalidate cache after creating new inventory
        InventoryService.invalidateInventoryCache(inventory.item_id);

        return saved;
    }

    /**
     * Get current inventory level for an item (cached)
     */
    public async getInventoryLevel(itemId: number): Promise<InventoryLevel | null> {
        const cacheKey = `inventory_level_${itemId}`;

        // Try cache first
        const cached = cache.get<InventoryLevel | null>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        const inventory = await this.inventoryRepository.findOne({
            where: { item: { id: itemId } },
        });

        if (!inventory) {
            cache.set(cacheKey, null);
            return null;
        }

        const available_quantity = inventory.quantity;
        const is_low_stock = inventory.reorder_point !== null
            ? available_quantity <= inventory.reorder_point
            : false;

        const result = {
            item_id: inventory.item_id,
            quantity: inventory.quantity,
            available_quantity,
            min_stock_level: inventory.min_stock_level,
            max_stock_level: inventory.max_stock_level,
            reorder_point: inventory.reorder_point,
            is_low_stock,
        };

        // Cache the result
        cache.set(cacheKey, result);
        return result;
    }

    /**
     * Get available stock (same as quantity) (cached)
     */
    public async getAvailableStock(itemId: number): Promise<number> {
        const cacheKey = `available_stock_${itemId}`;

        // Try cache first
        const cached = cache.get<number>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        const inventory = await this.inventoryRepository.findOne({
            where: { item: { id: itemId } },
        });

        if (!inventory) {
            cache.set(cacheKey, 0);
            return 0;
        }

        const result = inventory.quantity;

        // Cache the result
        cache.set(cacheKey, result);
        return result;
    }

    /**
     * Get all inventory items with item details (optimized with field selection, pagination, and caching)
     */
    public async getAllInventoryItems(options?: {
        limit?: number;
        offset?: number;
        search?: string;
    }): Promise<{
        items: Array<{
            item_id: number;
            item: {
                id: number;
                name: string;
                code: string;
                isStock: boolean;
                isGroup?: boolean;
                category?: {
                    id: number;
                    name: string;
                };
            };
            quantity: number;
            available_quantity: number;
            min_stock_level: number | null;
            max_stock_level: number | null;
            reorder_point: number | null;
            is_low_stock: boolean;
        }>;
        total: number;
    }> {
        // Create cache key based on options
        const cacheKey = `inventory_items_${JSON.stringify(options || {})}`;

        // Try to get from cache (only for non-paginated, non-search queries to avoid stale data)
        if (!options?.limit && !options?.offset && !options?.search) {
            const cached = cache.get<{
                items: Array<any>;
                total: number;
            }>(cacheKey);
            if (cached) {
                return cached;
            }
        }

        // Create base query with optimized field selection
        const baseQuery = this.inventoryRepository
            .createQueryBuilder("inventory")
            .leftJoinAndSelect("inventory.item", "item")
            .leftJoinAndSelect("item.category", "category")
            .orderBy("item.name", "ASC");

        // Add search filter if provided
        if (options?.search) {
            const searchTerm = `%${options.search}%`;
            baseQuery.where(
                "(item.name LIKE :search OR item.code LIKE :search)",
                { search: searchTerm }
            );
        }

        // Get total count before pagination (clone query to avoid affecting main query)
        const countQuery = baseQuery.clone();
        const total = await countQuery.getCount();

        // Add pagination if provided
        if (options?.limit) {
            baseQuery.limit(options.limit);
        }
        if (options?.offset) {
            baseQuery.offset(options.offset);
        }

        const inventories = await baseQuery.getMany();

        const items = inventories.map((inventory) => {
            const available_quantity = inventory.quantity;
            const is_low_stock = inventory.reorder_point !== null
                ? available_quantity <= inventory.reorder_point
                : false;

            return {
                item_id: inventory.item_id,
                item: {
                    id: inventory.item.id,
                    name: inventory.item.name,
                    code: inventory.item.code,
                    isStock: Boolean(inventory.item.isStock) || Number(inventory.item.isStock) === 1,
                    isGroup: Boolean(inventory.item.isGroup),
                    category: inventory.item.category ? {
                        id: inventory.item.category.id,
                        name: inventory.item.category.name,
                    } : undefined,
                },
                quantity: inventory.quantity,
                available_quantity,
                min_stock_level: inventory.min_stock_level,
                max_stock_level: inventory.max_stock_level,
                reorder_point: inventory.reorder_point,
                is_low_stock,
            };
        });

        const result = { items, total };

        // Cache the result (only for non-paginated, non-search queries)
        if (!options?.limit && !options?.offset && !options?.search) {
            cache.set(cacheKey, result);
        }

        return result;
    }

    /**
     * Invalidate inventory cache (call this when inventory is updated)
     * Invalidates all inventory-related cache entries
     */
    public static invalidateInventoryCache(itemId?: number): void {
        cache.invalidateMany([
            "inventory_items",
            "inventory_stats",
            "reorder_suggestions",
            "available_inventory",
            "inventory_transactions",
            "available_inventory_",
            itemId ? `inventory_level_${itemId}` : "inventory_level_",
            itemId ? `available_stock_${itemId}` : "available_stock_",
            itemId ? `inventory_history_${itemId}` : "inventory_history_",
        ]);
    }

    /**
     * Get available inventory for multiple items (batch operation).
     * Returns a map of item_id -> quantity available for **new** sales: on-hand minus demand
     * from everyone else's pending (unsubmitted) bills, matching createBill validation.
     * Not cached: pending bills change frequently.
     */
    public async getAvailableInventoryForItems(itemIds: number[], includeDetails?: false, options?: AvailableInventoryOptions): Promise<Map<number, number>>;
    public async getAvailableInventoryForItems(itemIds: number[], includeDetails: true, options?: AvailableInventoryOptions): Promise<{
        availability: Map<number, number>;
        missingConstituents: Map<number, Array<{ itemId: number; itemName: string; available: number; required: number }>>;
    }>;
    public async getAvailableInventoryForItems(
        itemIds: number[],
        includeDetails: boolean = false,
        options?: AvailableInventoryOptions
    ): Promise<Map<number, number> | {
        availability: Map<number, number>;
        missingConstituents: Map<number, Array<{ itemId: number; itemName: string; available: number; required: number }>>;
    }> {
        if (itemIds.length === 0) {
            return new Map();
        }

        // Get all items to check which are composite
        const items = await this.inventoryRepository.manager
            .getRepository(Item)
            .createQueryBuilder("item")
            .where("item.id IN (:...itemIds)", { itemIds })
            .getMany();

        if (items.length === 0) {
            // No items found, return 0 for all
            const result = new Map<number, number>();
            for (const itemId of itemIds) {
                result.set(itemId, 0);
            }
            return result;
        }

        const foundItemIds = items.map(item => item.id);

        // Get ratio definitions for all items at once using query builder
        // Note: item_id is the column name in the database
        // ItemGroup has eager: true on relations, so subItem and item should be fully loaded
        const allRatioDefinitions = await this.itemGroupRepository
            .createQueryBuilder("itemGroup")
            .leftJoinAndSelect("itemGroup.subItem", "subItem")
            .leftJoinAndSelect("itemGroup.item", "item")
            .where("itemGroup.item_id IN (:...itemIds)", { itemIds: foundItemIds })
            .getMany();

        // Group ratio definitions by item
        // IMPORTANT: Include ALL constituents for availability calculation, not just stock items
        // We only filter by isStock when actually deducting inventory
        const ratioDefinitionsByItem = new Map<number, Array<{ subItemId: number; portionSize: number; isStock: boolean }>>();
        const constituentItemIds = new Set<number>();

        // Single pass: group ratios and collect constituent IDs
        for (const ratio of allRatioDefinitions) {
            const itemId = ratio.item?.id;
            const subItem = ratio.subItem;

            if (!itemId || !subItem?.id) {
                continue;
            }

            // Skip if the constituent is the composite item itself (prevents circular references)
            if (subItem.id === itemId) {
                console.log(`[InventoryService] Skipping circular reference in availability: composite item ${itemId} cannot be a constituent of itself`);
                continue;
            }

            // Store essential data including isStock flag
            // We include ALL constituents for availability calculation
            // Note: Handle both boolean and number representations of isStock from DB
            const isStockValue = subItem.isStock ?? (subItem as any).is_stock ?? false;
            const isStockItem = Boolean(isStockValue) || Number(isStockValue) === 1;

            if (!ratioDefinitionsByItem.has(itemId)) {
                ratioDefinitionsByItem.set(itemId, []);
            }
            ratioDefinitionsByItem.get(itemId)!.push({
                subItemId: subItem.id,
                portionSize: ratio.portion_size,
                isStock: isStockItem,
            });

            // Collect all constituent IDs (both stock and non-stock) for inventory lookup
            constituentItemIds.add(subItem.id);
        }

        // Get inventories for both direct items and constituent items in one query
        const allItemIds = [...new Set([...itemIds, ...Array.from(constituentItemIds)])];
        const inventories = await this.inventoryRepository
            .createQueryBuilder("inventory")
            .innerJoin("inventory.item", "invItemForIds")
            .where("invItemForIds.id IN (:...itemIds)", { itemIds: allItemIds })
            .getMany();

        // On-hand quantities (physical rows)
        const inventoryMap = new Map<number, number>();
        for (const inventory of inventories) {
            inventoryMap.set(inventory.item_id, Math.max(0, inventory.quantity));
        }

        await this.subtractPendingBillsFromInventoryMap(inventoryMap, options?.excludeBillId);

        // Pre-calculate constituent availability for composite items (after pending-bill adjustment)
        const constituentAvailabilityMap = new Map<number, number>();
        for (const constituentId of constituentItemIds) {
            constituentAvailabilityMap.set(constituentId, inventoryMap.get(constituentId) || 0);
        }

        // Create a map of items by ID to check allowNegativeInventory flag
        const itemsMap = new Map<number, Item>();
        for (const item of items) {
            itemsMap.set(item.id, item);
        }

        // OPTIMIZATION: Batch load all constituent items to check allowNegativeInventory flags
        const allConstituentItemIds = Array.from(constituentItemIds);
        const allConstituentItems = allConstituentItemIds.length > 0
            ? await this.inventoryRepository.manager
                .getRepository(Item)
                .createQueryBuilder("item")
                .where("item.id IN (:...itemIds)", { itemIds: allConstituentItemIds })
                .getMany()
            : [];
        const constituentItemsMap = new Map<number, Item>();
        for (const item of allConstituentItems) {
            constituentItemsMap.set(item.id, item);
        }

        // Calculate availability for each item (optimized single pass)
        const result = new Map<number, number>();
        const missingConstituentsMap = new Map<number, Array<{ itemId: number; itemName: string; available: number; required: number }>>();

        for (const itemId of itemIds) {
            const item = itemsMap.get(itemId);
            const allowNegative = Boolean(item?.allowNegativeInventory) || Number(item?.allowNegativeInventory) === 1;

            // If item allows negative inventory, return a very large number to indicate unlimited availability
            if (allowNegative) {
                result.set(itemId, 999999); // Large number to indicate unlimited availability
                continue;
            }

            const ratios = ratioDefinitionsByItem.get(itemId);

            if (ratios && ratios.length > 0) {
                // Composite item: Calculate based on constituent availability
                // Availability = minimum of (constituent_available / portion_size) for all constituents
                // ALL constituents MUST be available for the composite item to be available
                let minAvailable = Infinity;
                let hasValidConstituents = false;
                const missingConstituents: Array<{ itemId: number; itemName: string; available: number; required: number }> = [];

                // Use pre-calculated constituent availability map (O(1) lookup)
                for (const ratio of ratios) {
                    // Check if this constituent has an inventory record (being tracked)
                    // If it's in the inventoryMap, it has a record (even if available is 0)
                    const hasInventoryRecord = inventoryMap.has(ratio.subItemId);

                    // Get availability - check both maps (constituentAvailabilityMap has all constituents,
                    // inventoryMap has all items including direct items)
                    const constituentAvailable = constituentAvailabilityMap.get(ratio.subItemId) ?? inventoryMap.get(ratio.subItemId) ?? 0;

                    hasValidConstituents = true;

                    // Get constituent item to check allowNegativeInventory flag
                    const constituentItem = constituentItemsMap.get(ratio.subItemId);
                    const constituentAllowsNegative = Boolean(constituentItem?.allowNegativeInventory) || Number(constituentItem?.allowNegativeInventory) === 1;

                    // CRITICAL: ALL constituents must be available for composite item to be available
                    // If constituent has no inventory record, it's not available (0 stock)
                    // If constituent has inventory record but is out of stock and doesn't allow negative, it's not available
                    if (!hasInventoryRecord) {
                        // Constituent has no inventory record - not available, composite item cannot be made
                        if (includeDetails && constituentItem) {
                            missingConstituents.push({
                                itemId: ratio.subItemId,
                                itemName: constituentItem.name || `Item ${ratio.subItemId}`,
                                available: 0,
                                required: ratio.portionSize, // Required per unit of composite item
                            });
                        }
                        minAvailable = 0;
                        // Don't break - collect all missing constituents for better UX
                    } else {
                        // Constituent has inventory record - check if it's available
                        if (!constituentAllowsNegative && constituentAvailable <= 0) {
                            // Constituent has inventory record but is out of stock - limit to 0
                            if (includeDetails && constituentItem) {
                                missingConstituents.push({
                                    itemId: ratio.subItemId,
                                    itemName: constituentItem.name || `Item ${ratio.subItemId}`,
                                    available: constituentAvailable,
                                    required: ratio.portionSize, // Required per unit of composite item
                                });
                            }
                            minAvailable = 0;
                            // Don't break - collect all missing constituents for better UX
                        } else {
                            // Constituent has inventory > 0, or allows negative - use it to calculate availability
                            // If allows negative, treat as having unlimited availability for this calculation
                            const effectiveAvailable = constituentAllowsNegative ? 999999 : constituentAvailable;
                            const compositeAvailable = effectiveAvailable / ratio.portionSize;
                            if (compositeAvailable < minAvailable) {
                                minAvailable = compositeAvailable;
                            }
                        }
                    }
                }

                // If no valid constituents found, set to 0
                const finalAvailable = (!hasValidConstituents || minAvailable === Infinity) ? 0 : Math.floor(minAvailable);
                result.set(itemId, finalAvailable);

                // Store missing constituents if details are requested and item is unavailable
                if (includeDetails && finalAvailable === 0 && missingConstituents.length > 0) {
                    missingConstituentsMap.set(itemId, missingConstituents);
                }
            } else {
                // Regular item: Use direct inventory (O(1) lookup)
                result.set(itemId, inventoryMap.get(itemId) || 0);
            }
        }

        if (!includeDetails) {
            return result;
        }
        return {
            availability: result,
            missingConstituents: missingConstituentsMap,
        };
    }

    /**
     * Reduce on-hand counts by quantities tied up in other users' pending bills (not yet submitted).
     * Mirrors composite expansion in deductInventoryForSale (sellable SKU + constituents).
     */
    private async subtractPendingBillsFromInventoryMap(
        inventoryMap: Map<number, number>,
        excludeBillId?: number,
    ): Promise<void> {
        const billItemRepo = this.inventoryRepository.manager.getRepository(BillItem);

        const qb = billItemRepo
            .createQueryBuilder("bi")
            .innerJoin("bi.bill", "b")
            .select("bi.item_id", "item_id")
            .addSelect("SUM(bi.quantity)", "quantity")
            .where("b.status = :pending", { pending: BillStatus.PENDING })
            .andWhere("bi.status NOT IN (:...ex)", {
                ex: [BillItemStatus.VOIDED, BillItemStatus.DELETED],
            })
            .groupBy("bi.item_id");

        if (excludeBillId != null && Number.isFinite(excludeBillId)) {
            qb.andWhere("b.id != :exId", { exId: excludeBillId });
        }

        const rows = await qb.getRawMany();
        if (rows.length === 0) {
            return;
        }

        const pendingSellableIds = rows
            .map((r: { item_id?: number | string }) => Number(r.item_id))
            .filter((id: number) => Number.isFinite(id) && id > 0);
        const uniquePendingIds = [...new Set(pendingSellableIds)];

        const pendingRatios = uniquePendingIds.length > 0
            ? await this.itemGroupRepository
                .createQueryBuilder("ig")
                .leftJoinAndSelect("ig.subItem", "subItem")
                .leftJoinAndSelect("ig.item", "item")
                .where("ig.item_id IN (:...ids)", { ids: uniquePendingIds })
                .getMany()
            : [];

        const ratioDefinitionsByPendingItem = new Map<number, Array<{ subItemId: number; portionSize: number }>>();
        for (const ratio of pendingRatios) {
            const itemId = ratio.item?.id;
            const subItem = ratio.subItem;
            if (!itemId || !subItem?.id || subItem.id === itemId) {
                continue;
            }
            if (!ratioDefinitionsByPendingItem.has(itemId)) {
                ratioDefinitionsByPendingItem.set(itemId, []);
            }
            ratioDefinitionsByPendingItem.get(itemId)!.push({
                subItemId: subItem.id,
                portionSize: ratio.portion_size,
            });
        }

        const demand = new Map<number, number>();
        const addDemand = (itemId: number, units: number) => {
            if (!itemId || units <= 0) {
                return;
            }
            demand.set(itemId, (demand.get(itemId) || 0) + units);
        };

        for (const row of rows) {
            const itemId = Number((row as { item_id?: number | string }).item_id);
            const qty = Number((row as { quantity?: number | string }).quantity);
            if (!Number.isFinite(itemId) || itemId <= 0 || !Number.isFinite(qty) || qty <= 0) {
                continue;
            }
            addDemand(itemId, qty);
            const pr = ratioDefinitionsByPendingItem.get(itemId);
            if (pr) {
                for (const r of pr) {
                    addDemand(r.subItemId, qty * r.portionSize);
                }
            }
        }

        for (const [itemId, d] of demand) {
            const physical = inventoryMap.has(itemId) ? inventoryMap.get(itemId)! : 0;
            inventoryMap.set(itemId, Math.max(0, physical - d));
        }
    }

    /**
     * Deduct inventory for composite items based on ratio definitions
     * For ALL constituents in the ratio, deducts quantity * portion_size
     * Respects allowNegativeInventory flag: if false, validates availability; if true, allows negative
     */
    private async deductInventoryForCompositeItem(
        itemId: number,
        quantity: number,
        billId: number,
        userId: number,
        transactionalEntityManager: any
    ): Promise<void> {
        // Fetch ratio definitions (ItemGroup entries) for this item
        // Use transactionalEntityManager to ensure it's part of the same transaction
        const ratioDefinitions = await transactionalEntityManager.find(ItemGroup, {
            where: { item: { id: itemId } },
            relations: ["subItem"],
        });

        if (ratioDefinitions.length === 0) {
            // No ratio definitions, nothing to deduct (will deduct the item itself separately)
            return;
        }

        // For each constituent in the ratio, deduct the calculated amount
        // ALL constituents are now deducted, regardless of isStock flag
        // IMPORTANT: Skip the composite item itself if it appears in its own ratio definitions (prevents circular references)
        for (const ratio of ratioDefinitions) {
            const constituentItem = ratio.subItem;

            if (!constituentItem) {
                continue;
            }

            // Skip if the constituent is the composite item itself (prevents circular references)
            if (constituentItem.id === itemId) {
                console.log(`[InventoryService] Skipping circular reference: composite item ${itemId} cannot be a constituent of itself during deduction`);
                continue;
            }

            // Calculate quantity to deduct: quantity sold × portion_size
            const quantityToDeduct = quantity * ratio.portion_size;

            // Get or create inventory for the constituent item
            let stockInventory = await transactionalEntityManager.findOne(Inventory, {
                where: { item: { id: constituentItem.id } },
            });

            if (!stockInventory) {
                // Constituent item doesn't have inventory yet, create it with 0 quantity
                stockInventory = transactionalEntityManager.create(Inventory, {
                    item: constituentItem,
                    quantity: 0,
                    created_by: userId,
                });
                stockInventory = await transactionalEntityManager.save(Inventory, stockInventory);
            }

            // Check allowNegativeInventory flag
            const allowNegative = constituentItem.allowNegativeInventory === true || constituentItem.allowNegativeInventory === 1;

            // Check available stock and validate (unless allowNegativeInventory is true)
            const availableStock = stockInventory.quantity;
            if (!allowNegative && availableStock < quantityToDeduct) {
                throw new Error(
                    `Insufficient stock for ingredient ${constituentItem.name}. ` +
                    `Available: ${availableStock}, Required: ${quantityToDeduct} ` +
                    `(${quantity} × ${ratio.portion_size} per unit)`
                );
            }

            // Deduct the constituent item
            stockInventory.quantity -= quantityToDeduct;
            stockInventory.updated_by = userId;
            await transactionalEntityManager.save(Inventory, stockInventory);

            // Create transaction record for constituent item deduction
            const transaction = transactionalEntityManager.create(InventoryTransaction, {
                item_id: constituentItem.id,
                transaction_type: InventoryTransactionType.SALE,
                quantity: -quantityToDeduct, // Negative for deduction
                reference_type: InventoryReferenceType.BILL,
                reference_id: billId,
                notes: `Deducted ${quantityToDeduct} (${quantity} × ${ratio.portion_size}) for composite item ${itemId} in bill ${billId}`,
                created_by: userId,
            });
            await transactionalEntityManager.save(InventoryTransaction, transaction);
        }

        InventoryService.invalidateInventoryCache();
    }

    /**
     * Deduct inventory when a bill is submitted (SUBMITTED).
     * Universal Tracking: ALL items (stock and non-stock) are deducted.
     * Negative Prevention: Items without allowNegativeInventory flag cannot go negative.
     * Supports ratio-based deduction for composite items (all constituents are deducted).
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

                // Skip if item is missing
                if (!item) {
                    continue;
                }

                // Check if item has ratio definitions (composite item)
                const hasRatioDefinitions = await this.itemGroupRepository.count({
                    where: { item: { id: item.id } },
                }) > 0;

                // If item has ratio definitions, deduct stock items per ratio
                if (hasRatioDefinitions) {
                    await this.deductInventoryForCompositeItem(
                        item.id,
                        billItem.quantity,
                        billId,
                        userId,
                        transactionalEntityManager
                    );
                }

                // Always deduct the sellable item itself 1:1 (default behavior)
                // This handles both simple items (no ratios) and composite items (with ratios)
                // ALL items are now tracked, so always create inventory record if it doesn't exist
                let inventory = await transactionalEntityManager.findOne(Inventory, {
                    where: { item: { id: item.id } },
                });

                if (!inventory) {
                    // Create inventory record if it doesn't exist (universal tracking)
                    inventory = transactionalEntityManager.create(Inventory, {
                        item,
                        quantity: 0,
                        created_by: userId,
                    });
                    inventory = await transactionalEntityManager.save(Inventory, inventory);
                }

                // Check allowNegativeInventory flag
                const allowNegative = Boolean(item.allowNegativeInventory) || Number(item.allowNegativeInventory) === 1;

                // Deduct inventory at submission time
                inventory.quantity -= billItem.quantity;
                inventory.updated_by = userId;
                // updated_at is automatically managed by TypeORM's UpdateDateColumn

                // Validate that quantity doesn't go negative (unless allowNegativeInventory is true)
                if (!allowNegative && inventory.quantity < 0) {
                    throw new Error(
                        `Inventory quantity would go negative for item ${item.id} (${item.name}). ` +
                        `Current: ${inventory.quantity + billItem.quantity}, Deducted: ${billItem.quantity}, Result: ${inventory.quantity}. ` +
                        "This should not happen if validation is working correctly."
                    );
                }

                await transactionalEntityManager.save(Inventory, inventory);

                // Create transaction record for deduction
                const transaction = transactionalEntityManager.create(InventoryTransaction, {
                    item_id: item.id,
                    transaction_type: InventoryTransactionType.SALE,
                    quantity: -billItem.quantity, // Negative for deduction
                    reference_type: InventoryReferenceType.BILL,
                    reference_id: billId,
                    notes: hasRatioDefinitions
                        ? `Deducted ${billItem.quantity} for composite item in bill ${billId} (stock items deducted per ratio)`
                        : `Deducted for bill ${billId}`,
                    created_by: userId,
                });
                await transactionalEntityManager.save(InventoryTransaction, transaction);
            }
        });

        // Invalidate cache after inventory deduction
        InventoryService.invalidateInventoryCache();
    }

    /**
     * Return inventory for voided item
     * Called when a bill item is voided after bill submission
     * Reverses the inventory deduction that was done in deductInventoryForSale
     * 
     * Universal Tracking: Returns inventory for both simple and composite items
     */
    public async returnInventoryForVoidedItem(
        billId: number,
        itemId: number,
        quantity: number,
        userId: number
    ): Promise<void> {
        const bill = await this.billRepository.findOne({
            where: { id: billId },
            relations: ["bill_items", "bill_items.item"],
        });

        if (!bill) {
            throw new Error(`Bill ${billId} not found`);
        }

        // Only return inventory if bill was already submitted (inventory was deducted)
        // REOPENED bills were previously SUBMITTED, so inventory was deducted
        // PENDING bills only have reserved inventory, not deducted yet
        if (bill.status !== BillStatus.SUBMITTED && bill.status !== BillStatus.CLOSED && bill.status !== BillStatus.REOPENED) {
            // Bill not submitted yet, inventory wasn't deducted, so nothing to return
            return;
        }

        const billItem = bill.bill_items?.find(item => item.id === itemId);
        if (!billItem || !billItem.item) {
            throw new Error(`Bill item ${itemId} not found in bill ${billId}`);
        }

        const item = billItem.item;

        // Use transaction to ensure atomicity
        await this.inventoryRepository.manager.transaction(async (transactionalEntityManager) => {
            // Check if item has ratio definitions (composite item)
            const hasRatioDefinitions = await this.itemGroupRepository.count({
                where: { item: { id: item.id } },
            }) > 0;

            // If item has ratio definitions, return stock items per ratio
            if (hasRatioDefinitions) {
                await this.returnInventoryForCompositeItem(
                    item.id,
                    quantity,
                    billId,
                    userId,
                    transactionalEntityManager
                );
            }

            // Always return the sellable item itself 1:1
            let inventory = await transactionalEntityManager.findOne(Inventory, {
                where: { item: { id: item.id } },
            });

            if (!inventory) {
                // Create inventory record if it doesn't exist
                inventory = transactionalEntityManager.create(Inventory, {
                    item,
                    quantity: 0,
                    created_by: userId,
                });
                inventory = await transactionalEntityManager.save(Inventory, inventory);
            }

            // Return inventory: increase quantity (reverse the deduction)
            inventory.quantity += quantity;
            inventory.updated_by = userId;

            await transactionalEntityManager.save(Inventory, inventory);

            // Create transaction record for return
            const transaction = transactionalEntityManager.create(InventoryTransaction, {
                item_id: item.id,
                transaction_type: InventoryTransactionType.RETURN,
                quantity: quantity, // Positive for return
                reference_type: InventoryReferenceType.BILL,
                reference_id: billId,
                notes: hasRatioDefinitions
                    ? `Returned ${quantity} for voided composite item in bill ${billId} (stock items returned per ratio)`
                    : `Returned for voided item in bill ${billId}`,
                created_by: userId,
            });
            await transactionalEntityManager.save(InventoryTransaction, transaction);
        });

        // Invalidate cache after inventory return
        InventoryService.invalidateInventoryCache();
    }

    /**
     * Return inventory for composite item (reverses deduction for constituent items)
     */
    private async returnInventoryForCompositeItem(
        itemId: number,
        quantity: number,
        billId: number,
        userId: number,
        transactionalEntityManager: any
    ): Promise<void> {
        const ratioDefinitions = await transactionalEntityManager.find(ItemGroup, {
            where: { item: { id: itemId } },
            relations: ["subItem"],
        });

        for (const ratio of ratioDefinitions) {
            const constituentItem = ratio.subItem;
            if (!constituentItem) {
                continue;
            }

            const quantityToReturn = quantity * ratio.portion_size;

            let inventory = await transactionalEntityManager.findOne(Inventory, {
                where: { item: { id: constituentItem.id } },
            });

            if (!inventory) {
                inventory = transactionalEntityManager.create(Inventory, {
                    item: constituentItem,
                    quantity: 0,
                    created_by: userId,
                });
                inventory = await transactionalEntityManager.save(Inventory, inventory);
            }

            // Return inventory for constituent item
            inventory.quantity += quantityToReturn;
            inventory.updated_by = userId;
            await transactionalEntityManager.save(Inventory, inventory);

            // Create transaction record
            const transaction = transactionalEntityManager.create(InventoryTransaction, {
                item_id: constituentItem.id,
                transaction_type: InventoryTransactionType.RETURN,
                quantity: quantityToReturn,
                reference_type: InventoryReferenceType.BILL,
                reference_id: billId,
                notes: `Returned ${quantityToReturn} for voided composite item (${constituentItem.name}) in bill ${billId}`,
                created_by: userId,
            });
            await transactionalEntityManager.save(InventoryTransaction, transaction);
        }
    }

    /**
     * Check for low stock items (raw SQL + explicit item mapping — stable on SQLite / standalone).
     */
    public async checkLowStock(): Promise<LowStockItem[]> {
        const selectSql = `
SELECT
  inv.item_id,
  inv.quantity,
  inv.min_stock_level,
  inv.max_stock_level,
  inv.reorder_point,
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
  it.updated_by AS it_updated_by
FROM inventory inv
LEFT JOIN item it ON it.id = inv.item_id
WHERE inv.reorder_point IS NOT NULL
`;
        const rows = (await this.inventoryRepository.manager.query(selectSql)) as Record<
            string,
            unknown
        >[];
        const list = Array.isArray(rows) ? rows : [];

        const lowStockItems: LowStockItem[] = [];

        for (const row of list) {
            const reorderPoint = row.reorder_point == null ? null : Number(row.reorder_point);
            const quantity = Number(row.quantity ?? 0);
            const itemId = Number(row.item_id);

            if (reorderPoint !== null && quantity <= reorderPoint) {
                const item =
                    row.it_id != null
                        ? mapItemRowWithPrefix(row, "it")
                        : ({ id: itemId } as Item);
                lowStockItems.push({
                    item_id: itemId,
                    quantity,
                    available_quantity: quantity,
                    min_stock_level:
                        row.min_stock_level == null ? null : Number(row.min_stock_level),
                    max_stock_level:
                        row.max_stock_level == null ? null : Number(row.max_stock_level),
                    reorder_point: reorderPoint,
                    is_low_stock: true,
                    item,
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
        const cacheKey = "reorder_suggestions";

        // Try cache first
        const cached = cache.get<Array<{
            item: Item;
            current_stock: number;
            reorder_point: number;
            suggested_quantity: number;
        }>>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        const lowStockItems = await this.checkLowStock();

        const result = lowStockItems.map((item) => ({
            item: item.item,
            current_stock: item.available_quantity,
            reorder_point: item.reorder_point!,
            suggested_quantity: item.max_stock_level
                ? item.max_stock_level - item.available_quantity
                : item.reorder_point! * 2, // Default: order 2x reorder point
        }));

        // Cache the result
        cache.set(cacheKey, result);
        return result;
    }

    /**
     * Get inventory statistics for dashboard (cached)
     */
    public async getInventoryStats(): Promise<{
        totalItems: number;
        lowStockItems: number;
        outOfStockItems: number;
        recentMovements: number;
    }> {
        const cacheKey = "inventory_stats";

        // Try cache first
        const cached = cache.get<{
            totalItems: number;
            lowStockItems: number;
            outOfStockItems: number;
            recentMovements: number;
        }>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        // Get total inventory items count
        const totalItems = await this.inventoryRepository.count();

        // Get low stock items
        const lowStockItems = await this.checkLowStock();
        const lowStockCount = lowStockItems.length;

        // Count out of stock items (quantity === 0) from all inventory items
        const outOfStockCount = await this.inventoryRepository
            .createQueryBuilder("inventory")
            .where("inventory.quantity <= 0")
            .getCount();

        // Get recent movements count (transactions in last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentMovements = await this.inventoryTransactionRepository
            .createQueryBuilder("transaction")
            .where("transaction.created_at >= :sevenDaysAgo", { sevenDaysAgo })
            .getCount();

        const result = {
            totalItems,
            lowStockItems: lowStockCount,
            outOfStockItems: outOfStockCount,
            recentMovements,
        };

        // Cache the result
        cache.set(cacheKey, result);
        return result;
    }

    /**
     * Get inventory transaction history for an item (cached with shorter TTL)
     */
    public async getInventoryHistory(
        itemId: number,
        limit: number = 100
    ): Promise<InventoryTransaction[]> {
        const cacheKey = `inventory_history_${itemId}_${limit}`;

        // Try cache first (history changes frequently, but still cache for performance)
        const cached = cache.get<InventoryTransaction[]>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        const result = await this.inventoryTransactionRepository
            .createQueryBuilder("transaction")
            .leftJoinAndSelect("transaction.item", "item")
            .where("transaction.item_id = :itemId", { itemId })
            .orderBy("transaction.created_at", "DESC")
            .limit(limit)
            .getMany();

        // Cache the result (shorter TTL handled by cache expiration)
        cache.set(cacheKey, result);
        return result;
    }

    /**
     * Get all inventory transactions with pagination (cached for non-search queries)
     */
    public async getAllInventoryTransactions(
        page: number = 1,
        pageSize: number = 10,
        itemId?: number,
        search?: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<{ transactions: InventoryTransaction[]; total: number }> {
        const hasDateFilter = startDate || endDate;
        // Only cache when no volatile filters are active
        const cacheKey = (search || hasDateFilter)
            ? null
            : `inventory_transactions_${page}_${pageSize}_${itemId || "all"}`;

        if (cacheKey) {
            const cached = cache.get<{ transactions: InventoryTransaction[]; total: number }>(cacheKey);
            if (cached !== null) {
                return cached;
            }
        }

        const query = this.inventoryTransactionRepository
            .createQueryBuilder("transaction")
            .leftJoinAndSelect("transaction.item", "item")
            .leftJoinAndSelect("transaction.created_by_user", "created_by_user")
            .orderBy("transaction.created_at", "DESC");

        const conditions: string[] = [];
        const params: Record<string, any> = {};

        if (itemId) {
            conditions.push("transaction.item_id = :itemId");
            params.itemId = itemId;
        }

        if (search) {
            const searchLower = `%${search.toLowerCase()}%`;
            conditions.push("(item.name LIKE :search OR item.code LIKE :search OR transaction.transaction_type LIKE :search)");
            params.search = searchLower;
        }

        if (startDate) {
            conditions.push("transaction.created_at >= :startDate");
            params.startDate = startDate;
        }

        if (endDate) {
            conditions.push("transaction.created_at <= :endDate");
            params.endDate = endDate;
        }

        if (conditions.length > 0) {
            query.where(conditions.join(" AND "), params);
        }

        const total = await query.getCount();
        query.skip((page - 1) * pageSize).take(pageSize);
        const transactions = await query.getMany();

        const result = { transactions, total };
        if (cacheKey) {
            cache.set(cacheKey, result);
        }
        return result;
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
            where: { item: { id: itemId } },
        });

        if (!inventory) {
            throw new Error(`Inventory not found for item ${itemId}`);
        }

        const quantityDifference = newQuantity - inventory.quantity;

        // Use update() to bypass TypeORM topological sorter (cyclic dependency with minified class names)
        await this.inventoryRepository.update(
            { item: { id: itemId } },
            { quantity: newQuantity, updated_by: userId }
        );
        inventory.quantity = newQuantity;

        // Use insert() to bypass topological sorter for new transaction records
        await this.inventoryTransactionRepository.insert({
            item_id: itemId,
            transaction_type: InventoryTransactionType.ADJUSTMENT,
            quantity: quantityDifference,
            reference_type: InventoryReferenceType.MANUAL_ADJUSTMENT,
            reference_id: null,
            notes: reason,
            created_by: userId,
        });

        // Invalidate cache after inventory adjustment
        InventoryService.invalidateInventoryCache();

        return inventory;
    }

    /**
     * Dispose/expire inventory items
     */
    public async disposeInventory(
        itemId: number,
        quantity: number,
        reason: string,
        userId: number
    ): Promise<Inventory> {
        const inventory = await this.inventoryRepository.findOne({
            where: { item: { id: itemId } },
        });

        if (!inventory) {
            throw new Error(`Inventory not found for item ${itemId}`);
        }

        const availableQuantity = inventory.quantity;

        if (quantity <= 0) {
            throw new Error("Disposal quantity must be greater than 0");
        }

        if (quantity > availableQuantity) {
            throw new Error(
                `Cannot dispose ${quantity} units. Only ${availableQuantity} units available`
            );
        }

        const newQuantity = inventory.quantity - quantity;
        await this.inventoryRepository.update(
            { item: { id: itemId } },
            { quantity: newQuantity, updated_by: userId }
        );
        inventory.quantity = newQuantity;

        await this.inventoryTransactionRepository.insert({
            item_id: itemId,
            transaction_type: InventoryTransactionType.DISPOSAL,
            quantity: -quantity,
            reference_type: InventoryReferenceType.MANUAL_ADJUSTMENT,
            reference_id: null,
            notes: reason,
            created_by: userId,
        });

        // Invalidate cache after inventory disposal
        InventoryService.invalidateInventoryCache();

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
            where: { item: { id: itemId } },
        });

        if (!inventory) {
            const result = await this.inventoryRepository.insert({
                item: { id: itemId } as Item,
                quantity: quantity,
                last_restocked_at: new Date(),
                created_by: userId,
            });
            inventory = await this.inventoryRepository.findOne({ where: { id: result.identifiers[0].id } });
        } else {
            const newQuantity = inventory.quantity + quantity;
            await this.inventoryRepository.update(
                { item: { id: itemId } },
                { quantity: newQuantity, last_restocked_at: new Date(), updated_by: userId }
            );
            inventory.quantity = newQuantity;
        }

        await this.inventoryTransactionRepository.insert({
            item_id: itemId,
            transaction_type: InventoryTransactionType.PURCHASE,
            quantity: quantity,
            reference_type: InventoryReferenceType.PURCHASE_ORDER,
            reference_id: purchaseOrderId,
            notes: `Received from purchase order ${purchaseOrderId}`,
            created_by: userId,
        });

        return inventory;
    }

    /**
     * Add inventory from production issue
     * Adds produced items to inventory (supports both stock and produced items)
     */
    public async addInventoryFromProduction(
        itemId: number,
        quantity: number,
        productionIssueId: number,
        userId: number
    ): Promise<Inventory> {
        // Get or create inventory (works for both isStock: true and isStock: false items)
        let inventory = await this.inventoryRepository.findOne({
            where: { item: { id: itemId } },
        });

        if (!inventory) {
            const result = await this.inventoryRepository.insert({
                item: { id: itemId } as Item,
                quantity: quantity,
                last_restocked_at: new Date(),
                created_by: userId,
            });
            inventory = await this.inventoryRepository.findOne({ where: { id: result.identifiers[0].id } });
        } else {
            const newQuantity = inventory.quantity + quantity;
            await this.inventoryRepository.update(
                { item: { id: itemId } },
                { quantity: newQuantity, last_restocked_at: new Date(), updated_by: userId }
            );
            inventory.quantity = newQuantity;
        }

        await this.inventoryTransactionRepository.insert({
            item_id: itemId,
            transaction_type: InventoryTransactionType.PRODUCTION,
            quantity: quantity,
            reference_type: InventoryReferenceType.PRODUCTION_ISSUE,
            reference_id: productionIssueId,
            notes: `Added from production issue ${productionIssueId}`,
            created_by: userId,
        });

        return inventory;
    }
}


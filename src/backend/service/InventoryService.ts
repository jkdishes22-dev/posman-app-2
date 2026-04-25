import { Inventory } from "@backend/entities/Inventory";
import { InventoryTransaction, InventoryTransactionType, InventoryReferenceType } from "@backend/entities/InventoryTransaction";
import { Item } from "@backend/entities/Item";
import { Bill, BillStatus } from "@backend/entities/Bill";
import { BillItem } from "@backend/entities/BillItem";
import { ItemGroup } from "@backend/entities/ItemGroup";
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

import { cache } from "@backend/utils/cache";

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
            where: { item_id: itemId },
        });

        if (!inventory) {
            cache.set(cacheKey, null);
            return null;
        }

        const available_quantity = inventory.quantity - inventory.reserved_quantity;
        const is_low_stock = inventory.reorder_point !== null
            ? available_quantity <= inventory.reorder_point
            : false;

        const result = {
            item_id: inventory.item_id,
            quantity: inventory.quantity,
            reserved_quantity: inventory.reserved_quantity,
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
     * Get available stock (quantity - reserved_quantity) (cached)
     */
    public async getAvailableStock(itemId: number): Promise<number> {
        const cacheKey = `available_stock_${itemId}`;

        // Try cache first
        const cached = cache.get<number>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        const inventory = await this.inventoryRepository.findOne({
            where: { item_id: itemId },
        });

        if (!inventory) {
            cache.set(cacheKey, 0);
            return 0;
        }

        const result = Math.max(0, inventory.quantity - inventory.reserved_quantity);

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
                category?: {
                    id: number;
                    name: string;
                };
            };
            quantity: number;
            reserved_quantity: number;
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
            const available_quantity = inventory.quantity - inventory.reserved_quantity;
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
                    category: inventory.item.category ? {
                        id: inventory.item.category.id,
                        name: inventory.item.category.name,
                    } : undefined,
                },
                quantity: inventory.quantity,
                reserved_quantity: inventory.reserved_quantity,
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
        // Invalidate all inventory-related caches
        cache.invalidate("inventory_items");
        cache.invalidate("inventory_stats");
        cache.invalidate("reorder_suggestions");
        cache.invalidate("available_inventory");
        cache.invalidate("inventory_transactions");

        // Invalidate all availability cache entries (pattern matching)
        // The cache key format is: available_inventory_1,2,3,4
        cache.invalidate("available_inventory_");

        // If specific itemId provided, invalidate item-specific caches
        if (itemId) {
            cache.invalidate(`inventory_level_${itemId}`);
            cache.invalidate(`available_stock_${itemId}`);
            cache.invalidate(`inventory_history_${itemId}`);
        } else {
            // Invalidate all item-specific caches
            cache.invalidate("inventory_level_");
            cache.invalidate("available_stock_");
            cache.invalidate("inventory_history_");
        }
    }

    /**
     * Get available inventory for multiple items (batch operation)
     * Returns a map of item_id -> available_quantity
     */
    public async getAvailableInventoryForItems(itemIds: number[]): Promise<Map<number, number>>;
    public async getAvailableInventoryForItems(itemIds: number[], includeDetails: false): Promise<Map<number, number>>;
    public async getAvailableInventoryForItems(itemIds: number[], includeDetails: true): Promise<{
        availability: Map<number, number>;
        missingConstituents: Map<number, Array<{ itemId: number; itemName: string; available: number; required: number }>>;
    }>;
    public async getAvailableInventoryForItems(
        itemIds: number[],
        includeDetails: boolean = false
    ): Promise<Map<number, number> | {
        availability: Map<number, number>;
        missingConstituents: Map<number, Array<{ itemId: number; itemName: string; available: number; required: number }>>;
    }> {
        if (itemIds.length === 0) {
            return new Map();
        }

        // Create cache key from sorted itemIds to ensure consistent caching
        const sortedIds = [...itemIds].sort((a, b) => a - b);
        const cacheKey = `available_inventory_${sortedIds.join(",")}`;

        // Try cache first
        const cached = cache.get<Map<number, number>>(cacheKey);
        if (cached !== null) {
            return cached;
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
            // Cache empty result
            cache.set(cacheKey, result);
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
            .where("inventory.item_id IN (:...itemIds)", { itemIds: allItemIds })
            .getMany();

        // Pre-calculate all available inventories in one pass
        const inventoryMap = new Map<number, number>();
        for (const inventory of inventories) {
            const available = inventory.quantity - inventory.reserved_quantity;
            inventoryMap.set(inventory.item_id, Math.max(0, available));
        }

        // Pre-calculate constituent availability for composite items (avoid repeated lookups)
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

        // Cache the result (only cache simple availability, not details)
        if (!includeDetails) {
            cache.set(cacheKey, result);
            return result;
        } else {
            // Return detailed result with missing constituents
            return {
                availability: result,
                missingConstituents: missingConstituentsMap,
            };
        }
    }

    /**
     * Reserve inventory for a bill (Phase 1: Reservation)
     * Called when bill is created (DRAFT status)
     * 
     * Universal Tracking: ALL items (stock and non-stock) are tracked and reserved.
     * Negative Prevention: Items without allowNegativeInventory flag cannot go negative.
     * 
     * @param billOrId - Either a Bill object with relations or a bill ID
     * @param userId - User ID performing the reservation
     */
    public async reserveInventoryForBill(billOrId: number | Bill, userId: number): Promise<void> {
        console.log(`[InventoryService] reserveInventoryForBill called with billOrId: ${typeof billOrId === "object" ? billOrId.id : billOrId}, userId: ${userId}`);

        let bill: Bill | null;

        // If bill object is passed, check if relations are already loaded
        if (typeof billOrId === "object" && billOrId !== null) {
            bill = billOrId;
            // Only reload if bill_items or item relations are missing
            const hasBillItems = bill.bill_items && bill.bill_items.length > 0;
            const hasItemRelations = hasBillItems && bill.bill_items.every((bi: any) => bi.item != null);

            if (!hasItemRelations) {
                console.log(`[InventoryService] Bill object passed, reloading with relations. Bill ID: ${bill.id}`);
                bill = await this.billRepository.findOne({
                    where: { id: bill.id },
                    relations: ["bill_items", "bill_items.item"],
                });
            } else {
                console.log(`[InventoryService] Bill object passed with relations already loaded. Bill ID: ${bill.id}`);
            }
        } else {
            const billId = billOrId as number;
            console.log(`[InventoryService] Bill ID passed, fetching bill ${billId}`);
            bill = await this.billRepository.findOne({
                where: { id: billId },
                relations: ["bill_items", "bill_items.item"],
            });
        }

        if (!bill) {
            console.error(`[InventoryService] Bill ${typeof billOrId === "object" ? billOrId.id : billOrId} not found`);
            throw new Error(`Bill ${typeof billOrId === "object" ? billOrId.id : billOrId} not found`);
        }

        console.log(`[InventoryService] Bill ${bill.id} found. Status: ${bill.status}, Bill items count: ${bill.bill_items?.length || 0}`);

        if (bill.status !== BillStatus.PENDING) {
            console.error(`[InventoryService] Cannot reserve inventory for bill ${bill.id} with status ${bill.status}`);
            throw new Error(`Cannot reserve inventory for bill ${bill.id} with status ${bill.status}`);
        }

        // Validate that bill items have item relations loaded
        if (!bill.bill_items || bill.bill_items.length === 0) {
            console.warn(`[InventoryService] Bill ${bill.id} has no bill items. Skipping inventory reservation.`);
            return;
        }

        const itemsWithoutRelations = bill.bill_items.filter(bi => !bi.item);
        if (itemsWithoutRelations.length > 0) {
            console.warn(`[InventoryService] Bill ${bill.id} has ${itemsWithoutRelations.length} bill items without item relations. These will be skipped.`);
        }

        console.log(`[InventoryService] Starting inventory reservation transaction for bill ${bill.id}`);

        // Use transaction to ensure atomicity
        await this.inventoryRepository.manager.transaction(async (transactionalEntityManager) => {
            // First, calculate total quantity needed per item (in case same item appears multiple times)
            const itemQuantities = new Map<number, number>();
            const itemMap = new Map<number, Item>(); // Store items for later use
            let skippedItems = 0;
            for (const billItem of bill.bill_items || []) {
                const item = billItem.item;
                if (!item) {
                    skippedItems++;
                    console.warn(`Bill item ${billItem.id} has no item relation. Skipping.`);
                    continue;
                }
                const currentTotal = itemQuantities.get(item.id) || 0;
                itemQuantities.set(item.id, currentTotal + billItem.quantity);
                itemMap.set(item.id, item);
            }

            if (skippedItems > 0) {
                console.warn(`Skipped ${skippedItems} bill items without item relations for bill ${bill.id}`);
            }

            if (itemQuantities.size === 0) {
                console.warn(`[InventoryService] No valid items found for bill ${bill.id}. No inventory transactions will be created.`);
                return;
            }

            console.log(`[InventoryService] Processing ${itemQuantities.size} unique items for bill ${bill.id}`);

            // OPTIMIZATION: Batch load all ratio definitions at once
            const itemIds = Array.from(itemQuantities.keys());
            const allRatioDefinitions = await transactionalEntityManager.find(ItemGroup, {
                where: itemIds.map(id => ({ item: { id } })),
                relations: ["subItem"],
            });

            // Group ratio definitions by item ID for quick lookup
            const ratioDefinitionsByItem = new Map<number, ItemGroup[]>();
            for (const ratio of allRatioDefinitions) {
                // ItemGroup has a relation to item, need to get it from the query
                // Since we loaded with relations, ratio.item should be available
                const itemId = ratio.item?.id;
                if (itemId) {
                    if (!ratioDefinitionsByItem.has(itemId)) {
                        ratioDefinitionsByItem.set(itemId, []);
                    }
                    ratioDefinitionsByItem.get(itemId)!.push(ratio);
                }
            }

            // OPTIMIZATION: Batch load all inventory records at once
            const allInventories = await transactionalEntityManager.find(Inventory, {
                where: itemIds.map(id => ({ item_id: id })),
            });
            const inventoryMap = new Map<number, Inventory>();
            for (const inv of allInventories) {
                inventoryMap.set(inv.item_id, inv);
            }

            // Now reserve inventory for each unique item
            for (const [itemId, totalQuantity] of itemQuantities.entries()) {
                console.log(`[InventoryService] Processing item ${itemId}, quantity: ${totalQuantity}`);
                const item = itemMap.get(itemId);

                if (!item) {
                    console.warn(`Item ${itemId} not found in bill items. Skipping.`);
                    continue;
                }

                // Get ratio definitions from pre-loaded map
                const ratioDefinitions = ratioDefinitionsByItem.get(itemId) || [];

                console.log(`[InventoryService] Item ${item.id} (${item.name}) has ${ratioDefinitions.length} ratio definitions`);

                if (ratioDefinitions.length > 0) {
                    // Composite item: Reserve from constituent items based on ratios
                    console.log(`[InventoryService] Item ${item.id} is composite, reserving from constituents`);
                    await this.reserveInventoryForCompositeItem(
                        item,
                        totalQuantity,
                        bill.id,
                        userId,
                        ratioDefinitions,
                        transactionalEntityManager
                    );

                    // ALWAYS reserve the sellable composite item itself 1:1 (same as deduction logic)
                    // This ensures inventory tracking for the sellable item regardless of constituent types
                    // NOTE: For composite items, availability is calculated from constituents (already validated above)
                    // We don't check the composite item's own inventory here - it's for tracking issued production only
                    console.log(`[InventoryService] Also reserving composite item ${item.id} itself (1:1) for tracking`);
                    let compositeInventory = inventoryMap.get(item.id);

                    if (!compositeInventory) {
                        compositeInventory = transactionalEntityManager.create(Inventory, {
                            item_id: item.id,
                            quantity: 0,
                            reserved_quantity: 0,
                            created_by: userId,
                        });
                        compositeInventory = await transactionalEntityManager.save(Inventory, compositeInventory);
                        inventoryMap.set(item.id, compositeInventory); // Cache for potential future use
                    }

                    // For composite items, we don't check their own inventory availability
                    // Availability is based on constituents, which was already validated in reserveInventoryForCompositeItem
                    // The composite item's inventory is for tracking issued production, not for availability checks
                    compositeInventory.reserved_quantity += totalQuantity;
                    compositeInventory.updated_by = userId;
                    await transactionalEntityManager.save(Inventory, compositeInventory);

                    // Create transaction record for composite item reservation
                    console.log(`[InventoryService] Creating inventory transaction for composite item ${item.id}, bill ${bill.id}, quantity: ${-totalQuantity}`);
                    const compositeTransaction = transactionalEntityManager.create(InventoryTransaction, {
                        item_id: item.id,
                        transaction_type: InventoryTransactionType.SALE,
                        quantity: -totalQuantity,
                        reference_type: InventoryReferenceType.BILL,
                        reference_id: bill.id,
                        notes: `Reserved ${totalQuantity} units for composite item ${item.name} in bill ${bill.id}`,
                        created_by: userId,
                    });
                    const savedCompositeTransaction = await transactionalEntityManager.save(InventoryTransaction, compositeTransaction);
                    console.log(`[InventoryService] Inventory transaction created: ID ${savedCompositeTransaction.id} for composite item ${item.id}`);
                } else {
                    console.log(`[InventoryService] Item ${item.id} is regular item, reserving directly`);
                    // Regular item: Reserve directly
                    // Reserve inventory for both stock items (isStock: true) and produced items (isStock: false)
                    // Both types need inventory tracking for sales

                    // Get inventory from pre-loaded map, or create if it doesn't exist
                    let inventory = inventoryMap.get(item.id);

                    if (!inventory) {
                        // Initialize inventory with 0 quantity if it doesn't exist
                        inventory = transactionalEntityManager.create(Inventory, {
                            item_id: item.id,
                            quantity: 0,
                            reserved_quantity: 0,
                            created_by: userId,
                        });
                        inventory = await transactionalEntityManager.save(Inventory, inventory);
                        inventoryMap.set(item.id, inventory); // Cache for potential future use
                    }

                    // Check allowNegativeInventory flag
                    const allowNegative = Boolean(item.allowNegativeInventory) || Number(item.allowNegativeInventory) === 1;

                    // Check available stock and validate (unless allowNegativeInventory is true)
                    // Available = total quantity - already reserved quantity
                    const availableStock = inventory.quantity - inventory.reserved_quantity;

                    if (!allowNegative && availableStock < totalQuantity) {
                        throw new Error(
                            `Insufficient stock for item ${item.name} (${item.code || "N/A"}). ` +
                            `Available: ${availableStock}, Required: ${totalQuantity}. ` +
                            `Please issue more ${item.name} to inventory before adding to bill.`
                        );
                    }

                    // Reserve the total quantity for this item
                    inventory.reserved_quantity += totalQuantity;
                    inventory.updated_by = userId;
                    // updated_at is automatically managed by TypeORM's UpdateDateColumn

                    await transactionalEntityManager.save(Inventory, inventory);

                    // Create transaction record for reservation (one per item, not per bill item)
                    console.log(`[InventoryService] Creating inventory transaction for item ${item.id}, bill ${bill.id}, quantity: ${-totalQuantity}`);
                    const transaction = transactionalEntityManager.create(InventoryTransaction, {
                        item_id: item.id,
                        transaction_type: InventoryTransactionType.SALE,
                        quantity: -totalQuantity, // Negative for reservation (not yet deducted)
                        reference_type: InventoryReferenceType.BILL,
                        reference_id: bill.id,
                        notes: `Reserved ${totalQuantity} units for bill ${bill.id}`,
                        created_by: userId,
                    });
                    const savedTransaction = await transactionalEntityManager.save(InventoryTransaction, transaction);
                    console.log(`[InventoryService] Inventory transaction created: ID ${savedTransaction.id} for item ${item.id}`);
                }
            }

            console.log(`[InventoryService] Completed inventory reservation transaction for bill ${bill.id}`);
        });

        console.log(`[InventoryService] Successfully reserved inventory for bill ${bill.id}`);
    }

    /**
     * Reserve inventory for composite items based on ratio definitions
     * For ALL constituents in the ratio, reserves quantity * portion_size
     * Respects allowNegativeInventory flag: if false, validates availability; if true, allows negative
     */
    private async reserveInventoryForCompositeItem(
        compositeItem: Item,
        quantity: number,
        billId: number,
        userId: number,
        ratioDefinitions: ItemGroup[],
        transactionalEntityManager: any
    ): Promise<void> {
        console.log(`[InventoryService] reserveInventoryForCompositeItem: compositeItem ${compositeItem.id} (${compositeItem.name}), quantity: ${quantity}, billId: ${billId}`);

        // OPTIMIZATION: Batch load all constituent inventories and items first
        const allConstituentIds = ratioDefinitions.map(r => r.subItem?.id).filter(Boolean) as number[];

        // Load all constituent items to check allowNegativeInventory flag
        const constituentItems = allConstituentIds.length > 0
            ? await transactionalEntityManager.find(Item, {
                where: allConstituentIds.map(id => ({ id })),
            })
            : [];
        const constituentItemMap = new Map<number, Item>();
        for (const item of constituentItems) {
            constituentItemMap.set(item.id, item);
        }

        const allConstituentInventories = allConstituentIds.length > 0
            ? await transactionalEntityManager.find(Inventory, {
                where: allConstituentIds.map(id => ({ item_id: id })),
            })
            : [];
        const constituentInventoryMap = new Map<number, Inventory>();
        for (const inv of allConstituentInventories) {
            constituentInventoryMap.set(inv.item_id, inv);
        }

        // Aggregate quantities needed per constituent item
        // ALL constituents are now included, regardless of isStock flag
        // IMPORTANT: Skip the composite item itself if it appears in its own ratio definitions (prevents circular references)
        const constituentQuantities = new Map<number, number>();

        for (const ratio of ratioDefinitions) {
            const constituentItem = ratio.subItem;

            if (!constituentItem) {
                console.log("[InventoryService] Skipping constituent with no item data");
                continue;
            }

            // Skip if the constituent is the composite item itself (prevents circular references)
            if (constituentItem.id === compositeItem.id) {
                console.log(`[InventoryService] Skipping circular reference: composite item ${compositeItem.id} (${compositeItem.name}) cannot be a constituent of itself`);
                continue;
            }

            // Calculate quantity to reserve: quantity sold × portion_size
            const quantityToReserve = quantity * ratio.portion_size;
            const currentTotal = constituentQuantities.get(constituentItem.id) || 0;
            constituentQuantities.set(constituentItem.id, currentTotal + quantityToReserve);
            console.log(`[InventoryService] Constituent ${constituentItem.id} (${constituentItem.name}): reserving ${quantityToReserve} (${quantity} × ${ratio.portion_size})`);
        }

        if (constituentQuantities.size === 0) {
            console.warn(`[InventoryService] No constituents found in ratio definitions for composite item ${compositeItem.id}. No inventory will be reserved.`);
            return;
        }

        console.log(`[InventoryService] Reserving inventory for ${constituentQuantities.size} constituents`);

        // OPTIMIZATION: Batch load all constituent inventories at once
        const constituentItemIds = Array.from(constituentQuantities.keys());
        const stockInventories = await transactionalEntityManager.find(Inventory, {
            where: constituentItemIds.map(id => ({ item_id: id })),
        });
        const stockInventoryMap = new Map<number, Inventory>();
        for (const inv of stockInventories) {
            stockInventoryMap.set(inv.item_id, inv);
        }

        // Reserve inventory for each constituent item
        for (const [constituentItemId, totalQuantityToReserve] of constituentQuantities.entries()) {
            // Get constituent item to check allowNegativeInventory flag
            const constituentItem = constituentItemMap.get(constituentItemId);
            const allowNegative = Boolean(constituentItem?.allowNegativeInventory) || Number(constituentItem?.allowNegativeInventory) === 1;

            // Get inventory from pre-loaded map, or create if it doesn't exist
            let stockInventory = stockInventoryMap.get(constituentItemId);

            if (!stockInventory) {
                // Constituent item doesn't have inventory yet, create it with 0 quantity
                stockInventory = transactionalEntityManager.create(Inventory, {
                    item_id: constituentItemId,
                    quantity: 0,
                    reserved_quantity: 0,
                    created_by: userId,
                });
                stockInventory = await transactionalEntityManager.save(Inventory, stockInventory);
                stockInventoryMap.set(constituentItemId, stockInventory); // Cache for potential future use
            }

            // Check available stock and validate (unless allowNegativeInventory is true)
            const availableStock = stockInventory.quantity - stockInventory.reserved_quantity;
            if (!allowNegative && availableStock < totalQuantityToReserve) {
                // Find the constituent item name for error message
                const constituentItemName = constituentItem?.name || `Item ${constituentItemId}`;
                throw new Error(
                    `Insufficient stock for ingredient ${constituentItemName} in composite item ${compositeItem.name}. ` +
                    `Available: ${availableStock}, Required: ${totalQuantityToReserve} ` +
                    `(${quantity} × ${ratioDefinitions.find(r => r.subItem?.id === constituentItemId)?.portion_size || "N/A"} per unit). ` +
                    `Please issue more ${constituentItemName} to inventory before adding to bill.`
                );
            }

            // Reserve the constituent item
            stockInventory.reserved_quantity += totalQuantityToReserve;
            stockInventory.updated_by = userId;
            await transactionalEntityManager.save(Inventory, stockInventory);

            // Create transaction record for constituent item reservation
            console.log(`[InventoryService] Creating inventory transaction for constituent ${constituentItemId}, bill ${billId}, quantity: ${-totalQuantityToReserve}`);
            const transaction = transactionalEntityManager.create(InventoryTransaction, {
                item_id: constituentItemId,
                transaction_type: InventoryTransactionType.SALE,
                quantity: -totalQuantityToReserve, // Negative for reservation
                reference_type: InventoryReferenceType.BILL,
                reference_id: billId,
                notes: `Reserved ${totalQuantityToReserve} (${quantity} × ${ratioDefinitions.find(r => r.subItem?.id === constituentItemId)?.portion_size || "N/A"}) for composite item ${compositeItem.name} in bill ${billId}`,
                created_by: userId,
            });
            const savedTransaction = await transactionalEntityManager.save(InventoryTransaction, transaction);
            console.log(`[InventoryService] Inventory transaction created: ID ${savedTransaction.id} for constituent ${constituentItemId}`);
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
                where: { item_id: constituentItem.id },
            });

            if (!stockInventory) {
                // Constituent item doesn't have inventory yet, create it with 0 quantity
                stockInventory = transactionalEntityManager.create(Inventory, {
                    item_id: constituentItem.id,
                    quantity: 0,
                    reserved_quantity: 0,
                    created_by: userId,
                });
                stockInventory = await transactionalEntityManager.save(Inventory, stockInventory);
            }

            // Check allowNegativeInventory flag
            const allowNegative = constituentItem.allowNegativeInventory === true || constituentItem.allowNegativeInventory === 1;

            // Check available stock and validate (unless allowNegativeInventory is true)
            const availableStock = stockInventory.quantity - stockInventory.reserved_quantity;
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

        // Invalidate cache after inventory reservation
        InventoryService.invalidateInventoryCache();
    }

    /**
     * Convert reservation to actual deduction (Phase 2: Deduction)
     * Called when bill is submitted (SUBMITTED status)
     * 
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
                    where: { item_id: item.id },
                });

                if (!inventory) {
                    // Create inventory record if it doesn't exist (universal tracking)
                    inventory = transactionalEntityManager.create(Inventory, {
                        item_id: item.id,
                        quantity: 0,
                        reserved_quantity: 0,
                        created_by: userId,
                    });
                    inventory = await transactionalEntityManager.save(Inventory, inventory);
                }

                // Check allowNegativeInventory flag
                const allowNegative = Boolean(item.allowNegativeInventory) || Number(item.allowNegativeInventory) === 1;

                // Check if quantity was reserved (unless allowNegativeInventory is true)
                if (!allowNegative && inventory.reserved_quantity < billItem.quantity) {
                    throw new Error(
                        `Reserved quantity mismatch for item ${item.id} (${item.name}). Reserved: ${inventory.reserved_quantity}, Required: ${billItem.quantity}`
                    );
                }

                // Convert reservation to deduction: decrease both quantity and reserved_quantity
                inventory.quantity -= billItem.quantity;
                inventory.reserved_quantity -= billItem.quantity;
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
                where: { item_id: item.id },
            });

            if (!inventory) {
                // Create inventory record if it doesn't exist
                inventory = transactionalEntityManager.create(Inventory, {
                    item_id: item.id,
                    quantity: 0,
                    reserved_quantity: 0,
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
                where: { item_id: constituentItem.id },
            });

            if (!inventory) {
                inventory = transactionalEntityManager.create(Inventory, {
                    item_id: constituentItem.id,
                    quantity: 0,
                    reserved_quantity: 0,
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
     * Release inventory reservation
     * Called when bill is cancelled/deleted (DRAFT status only)
     * 
     * Universal Tracking: ALL constituents (stock and non-stock) have reservations released.
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

                // Skip if item is missing
                if (!item) {
                    continue;
                }

                // Check if item is a composite item
                const ratioDefinitions = await transactionalEntityManager.find(ItemGroup, {
                    where: { item: { id: item.id } },
                    relations: ["subItem"],
                });

                if (ratioDefinitions.length > 0) {
                    // Composite item: Release reservations from ALL constituent items
                    // ALL constituents are now released, regardless of isStock flag
                    for (const ratio of ratioDefinitions) {
                        const constituentItem = ratio.subItem;
                        if (!constituentItem) {
                            continue;
                        }

                        const quantityToRelease = billItem.quantity * ratio.portion_size;

                        const inventory = await transactionalEntityManager.findOne(Inventory, {
                            where: { item_id: constituentItem.id },
                        });

                        if (!inventory) {
                            // Inventory doesn't exist, skip (shouldn't happen if reservation was successful)
                            continue;
                        }

                        // Release the reserved quantity
                        if (inventory.reserved_quantity >= quantityToRelease) {
                            inventory.reserved_quantity -= quantityToRelease;
                            inventory.updated_by = userId;
                            await transactionalEntityManager.save(Inventory, inventory);

                            // Create transaction record for release
                            const transaction = transactionalEntityManager.create(InventoryTransaction, {
                                item_id: constituentItem.id,
                                transaction_type: InventoryTransactionType.ADJUSTMENT,
                                quantity: quantityToRelease, // Positive for release
                                reference_type: InventoryReferenceType.BILL,
                                reference_id: billId,
                                notes: `Released reservation for cancelled bill ${billId} (composite item ${item.name})`,
                                created_by: userId,
                            });
                            await transactionalEntityManager.save(InventoryTransaction, transaction);
                        }
                    }
                } else {
                    // Regular item: Release inventory reservation
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
            }
        });

        // Invalidate cache after releasing inventory reservation
        InventoryService.invalidateInventoryCache();
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

        // Count out of stock items (available_quantity === 0) from all inventory items
        const outOfStockCount = await this.inventoryRepository
            .createQueryBuilder("inventory")
            .where("(inventory.quantity - inventory.reserved_quantity) <= 0")
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
        search?: string
    ): Promise<{ transactions: InventoryTransaction[]; total: number }> {
        // Only cache if no search (search results change frequently)
        const cacheKey = search
            ? null
            : `inventory_transactions_${page}_${pageSize}_${itemId || "all"}`;

        // Try cache first (only for non-search queries)
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

        if (itemId) {
            query.where("transaction.item_id = :itemId", { itemId });
        }

        if (search) {
            const searchLower = `%${search.toLowerCase()}%`;
            if (itemId) {
                query.andWhere(
                    "(item.name LIKE :search OR item.code LIKE :search OR transaction.transaction_type LIKE :search)",
                    { search: searchLower }
                );
            } else {
                query.where(
                    "(item.name LIKE :search OR item.code LIKE :search OR transaction.transaction_type LIKE :search)",
                    { search: searchLower }
                );
            }
        }

        const total = await query.getCount();

        query.skip((page - 1) * pageSize).take(pageSize);
        const transactions = await query.getMany();

        const result = { transactions, total };

        // Cache the result (only for non-search queries)
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
            where: { item_id: itemId },
        });

        if (!inventory) {
            throw new Error(`Inventory not found for item ${itemId}`);
        }

        const quantityDifference = newQuantity - inventory.quantity;

        // Use update() to bypass TypeORM topological sorter (cyclic dependency with minified class names)
        await this.inventoryRepository.update(
            { item_id: itemId },
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
            where: { item_id: itemId },
        });

        if (!inventory) {
            throw new Error(`Inventory not found for item ${itemId}`);
        }

        const availableQuantity = inventory.quantity - inventory.reserved_quantity;

        if (quantity <= 0) {
            throw new Error("Disposal quantity must be greater than 0");
        }

        if (quantity > availableQuantity) {
            throw new Error(
                `Cannot dispose ${quantity} units. Only ${availableQuantity} units available (${inventory.quantity} total - ${inventory.reserved_quantity} reserved)`
            );
        }

        const newQuantity = inventory.quantity - quantity;
        await this.inventoryRepository.update(
            { item_id: itemId },
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
            where: { item_id: itemId },
        });

        if (!inventory) {
            const result = await this.inventoryRepository.insert({
                item_id: itemId,
                quantity: quantity,
                reserved_quantity: 0,
                last_restocked_at: new Date(),
                created_by: userId,
            });
            inventory = await this.inventoryRepository.findOne({ where: { id: result.identifiers[0].id } });
        } else {
            const newQuantity = inventory.quantity + quantity;
            await this.inventoryRepository.update(
                { item_id: itemId },
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
            where: { item_id: itemId },
        });

        if (!inventory) {
            const result = await this.inventoryRepository.insert({
                item_id: itemId,
                quantity: quantity,
                reserved_quantity: 0,
                last_restocked_at: new Date(),
                created_by: userId,
            });
            inventory = await this.inventoryRepository.findOne({ where: { id: result.identifiers[0].id } });
        } else {
            const newQuantity = inventory.quantity + quantity;
            await this.inventoryRepository.update(
                { item_id: itemId },
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


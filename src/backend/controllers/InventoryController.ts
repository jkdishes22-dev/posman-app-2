import { InventoryService } from "@backend/service/InventoryService";
import { ItemService } from "@backend/service/ItemService";
import { NextApiRequest, NextApiResponse } from "next";
import { handleApiError } from "@backend/utils/errorHandler";
import { parseStartDateInAppTz, parseEndDateInAppTz } from "@backend/utils/dateRange";

export const fetchInventoryHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const inventoryService = new InventoryService(req.db);
    try {
        // Parse query parameters for pagination and search
        const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
        const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined;
        const search = req.query.search as string | undefined;

        const limit = pageSize;
        const offset = page && pageSize ? (page - 1) * pageSize : undefined;

        const result = await inventoryService.getAllInventoryItems({
            limit,
            offset,
            search,
        });

        // If pagination is requested, return paginated response
        if (limit !== undefined) {
            res.status(200).json({
                items: result.items,
                total: result.total,
                page: page || 1,
                pageSize: limit,
                totalPages: Math.ceil(result.total / limit),
            });
        } else {
            // Backward compatibility: return array if no pagination
            res.status(200).json(result.items);
        }
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "fetching",
            resource: "inventory"
        });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const fetchInventoryItemHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const inventoryService = new InventoryService(req.db);
    try {
        const { itemId } = req.query;
        const inventoryLevel = await inventoryService.getInventoryLevel(Number(itemId));

        if (!inventoryLevel) {
            return res.status(404).json({ message: "Inventory not found for this item" });
        }

        res.status(200).json(inventoryLevel);
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "fetching",
            resource: "inventory item"
        });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const updateInventoryHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const inventoryService = new InventoryService(req.db);
    try {
        const { itemId } = req.query;
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { min_stock_level, max_stock_level, reorder_point } = req.body;

        // This would need to be implemented in InventoryService
        // For now, return not implemented
        res.status(501).json({ message: "Update inventory levels not yet implemented" });
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "updating",
            resource: "inventory"
        });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const adjustInventoryHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const inventoryService = new InventoryService(req.db);
    try {
        const { itemId } = req.query;
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Accept both camelCase and snake_case field names
        const newQuantity = req.body.newQuantity || req.body.new_quantity;
        const reason = req.body.reason;

        if (newQuantity === undefined || newQuantity === null || reason === undefined || reason === null || reason.trim() === "") {
            return res.status(400).json({
                message: "newQuantity and reason are required",
            });
        }

        const inventory = await inventoryService.adjustInventory(
            Number(itemId),
            Number(newQuantity),
            reason.trim(),
            userId
        );
        res.status(200).json(inventory);
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "adjusting",
            resource: "inventory"
        });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const getLowStockHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const inventoryService = new InventoryService(req.db);
    try {
        const lowStockItems = await inventoryService.checkLowStock();
        res.status(200).json(lowStockItems);
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "fetching",
            resource: "low stock items"
        });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const disposeInventoryHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const inventoryService = new InventoryService(req.db);
    try {
        const { itemId } = req.query;
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { quantity, reason, reasonType } = req.body;

        if (!quantity || quantity <= 0) {
            return res.status(400).json({
                message: "Quantity is required and must be greater than 0",
            });
        }

        if (!reason && !reasonType) {
            return res.status(400).json({
                message: "Reason or reason type is required",
            });
        }

        // Build reason string from reasonType and custom reason
        let disposalReason = "";
        if (reasonType && reasonType !== "Other") {
            disposalReason = reasonType;
            if (reason && reason.trim()) {
                disposalReason += `: ${reason.trim()}`;
            }
        } else if (reason && reason.trim()) {
            disposalReason = reason.trim();
        } else {
            disposalReason = reasonType || "Disposal";
        }

        const inventory = await inventoryService.disposeInventory(
            Number(itemId),
            Number(quantity),
            disposalReason,
            userId
        );
        res.status(200).json(inventory);
    } catch (error: any) {
        const isValidationError = error?.message && (
            error.message.includes("Cannot dispose") ||
            error.message.includes("must be greater") ||
            error.message.includes("not found")
        );
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "disposing",
            resource: "inventory"
        });
        res.status(isValidationError ? 400 : 500).json({ error: userMessage, code: errorCode });
    }
};

export const getInventoryStatsHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const inventoryService = new InventoryService(req.db);
    try {
        const stats = await inventoryService.getInventoryStats();
        res.status(200).json(stats);
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "fetching",
            resource: "inventory statistics"
        });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const getReorderSuggestionsHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const inventoryService = new InventoryService(req.db);
    try {
        const suggestions = await inventoryService.getReorderSuggestions();
        res.status(200).json(suggestions);
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "fetching",
            resource: "reorder suggestions"
        });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const getInventoryHistoryHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const inventoryService = new InventoryService(req.db);
    try {
        const { itemId } = req.query;
        const limit = req.query.limit ? Number(req.query.limit) : 100;

        const history = await inventoryService.getInventoryHistory(
            Number(itemId),
            limit
        );
        res.status(200).json(history);
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "fetching",
            resource: "inventory history"
        });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const getInventoryTransactionFilterItemsHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const itemService = new ItemService(req.db);
    try {
        const items = await itemService.fetchNonGroupActiveItemsForSelect();
        res.status(200).json({ items });
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "fetching",
            resource: "inventory transaction filter items",
        });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const getAllInventoryTransactionsHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const inventoryService = new InventoryService(req.db);
    try {
        const page = req.query.page ? Number(req.query.page) : 1;
        const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 10;
        const itemId = req.query.itemId ? Number(req.query.itemId) : undefined;
        const search = Array.isArray(req.query.search)
            ? req.query.search[0]
            : req.query.search;

        const startDate = parseStartDateInAppTz(req.query.startDate as string);
        const endDate = parseEndDateInAppTz(req.query.endDate as string);

        const result = await inventoryService.getAllInventoryTransactions(
            page,
            pageSize,
            itemId,
            search,
            startDate,
            endDate
        );
        res.status(200).json(result);
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "fetching",
            resource: "inventory transactions"
        });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const getAvailableInventoryHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const inventoryService = new InventoryService(req.db);
    try {
        const { itemIds, includeDetails, excludeBillId: excludeBillIdRaw } = req.query;

        if (!itemIds) {
            return res.status(400).json({
                message: "itemIds query parameter is required (comma-separated list)",
            });
        }

        // Parse comma-separated item IDs
        const itemIdArray = (itemIds as string)
            .split(",")
            .map(id => parseInt(id.trim(), 10))
            .filter(id => !isNaN(id));

        if (itemIdArray.length === 0) {
            return res.status(400).json({
                message: "At least one valid item ID is required",
            });
        }

        let excludeBillId: number | undefined;
        if (excludeBillIdRaw !== undefined && excludeBillIdRaw !== "") {
            const parsed = parseInt(String(excludeBillIdRaw), 10);
            if (Number.isNaN(parsed) || parsed <= 0) {
                return res.status(400).json({
                    message: "excludeBillId must be a positive integer when provided",
                });
            }
            excludeBillId = parsed;
        }

        const availabilityOptions = excludeBillId !== undefined ? { excludeBillId } : undefined;

        // Check if details are requested
        const includeDetailsFlag = includeDetails === "true" || includeDetails === "1";

        if (includeDetailsFlag) {
            const result = await inventoryService.getAvailableInventoryForItems(itemIdArray, true, availabilityOptions);

            // Convert Maps to objects for JSON response
            const available: Record<number, number> = {};
            result.availability.forEach((avail, itemId) => {
                available[itemId] = avail;
            });

            const missingConstituents: Record<number, Array<{ itemId: number; itemName: string; available: number; required: number }>> = {};
            result.missingConstituents.forEach((constituents, itemId) => {
                missingConstituents[itemId] = constituents;
            });

            res.status(200).json({
                available,
                missingConstituents,
            });
        } else {
            const availableMap = await inventoryService.getAvailableInventoryForItems(itemIdArray, false, availabilityOptions);

            // Convert Map to object for JSON response
            const result: Record<number, number> = {};
            availableMap.forEach((available, itemId) => {
                result[itemId] = available;
            });

            res.status(200).json({ available: result });
        }
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "fetching",
            resource: "available inventory"
        });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};


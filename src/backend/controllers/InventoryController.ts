import { InventoryService } from "@backend/service/InventoryService";
import { NextApiRequest, NextApiResponse } from "next";

export const fetchInventoryHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const inventoryService = new InventoryService(req.db);
    try {
        const inventoryItems = await inventoryService.getAllInventoryItems();
        res.status(200).json(inventoryItems);
    } catch (error: any) {
        console.error("Error fetching inventory:", error);
        res.status(500).json({
            message: "Failed to fetch inventory",
            error: error.message,
        });
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
        console.error("Error fetching inventory item:", error);
        res.status(500).json({
            message: "Failed to fetch inventory item",
            error: error.message,
        });
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
        console.error("Error updating inventory:", error);
        res.status(500).json({
            message: "Failed to update inventory",
            error: error.message,
        });
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
        console.error("Error adjusting inventory:", error);
        res.status(500).json({
            message: "Failed to adjust inventory",
            error: error.message,
        });
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
        console.error("Error fetching low stock items:", error);
        res.status(500).json({
            message: "Failed to fetch low stock items",
            error: error.message,
        });
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
        console.error("Error disposing inventory:", error);
        res.status(500).json({
            message: "Failed to dispose inventory",
            error: error.message,
        });
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
        console.error("Error fetching inventory stats:", error);
        res.status(500).json({
            message: "Failed to fetch inventory stats",
            error: error.message,
        });
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
        console.error("Error fetching reorder suggestions:", error);
        res.status(500).json({
            message: "Failed to fetch reorder suggestions",
            error: error.message,
        });
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
        console.error("Error fetching inventory history:", error);
        res.status(500).json({
            message: "Failed to fetch inventory history",
            error: error.message,
        });
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

        const result = await inventoryService.getAllInventoryTransactions(
            page,
            pageSize,
            itemId,
            search
        );
        res.status(200).json(result);
    } catch (error: any) {
        console.error("Error fetching inventory transactions:", error);
        res.status(500).json({
            message: "Failed to fetch inventory transactions",
            error: error.message,
        });
    }
};

export const getAvailableInventoryHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const inventoryService = new InventoryService(req.db);
    try {
        const { itemIds } = req.query;

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

        const availableMap = await inventoryService.getAvailableInventoryForItems(itemIdArray);

        // Convert Map to object for JSON response
        const result: Record<number, number> = {};
        availableMap.forEach((available, itemId) => {
            result[itemId] = available;
        });

        res.status(200).json({ available: result });
    } catch (error: any) {
        console.error("Error fetching available inventory:", error);
        res.status(500).json({
            message: "Failed to fetch available inventory",
            error: error.message,
        });
    }
};


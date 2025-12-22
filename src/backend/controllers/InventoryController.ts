import { InventoryService } from "@backend/service/InventoryService";
import { NextApiRequest, NextApiResponse } from "next";

export const fetchInventoryHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const inventoryService = new InventoryService(req.db);
    try {
        // This would need to be implemented to fetch all inventory items
        // For now, return empty array - can be enhanced later
        res.status(200).json([]);
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

        const { newQuantity, reason } = req.body;

        if (!newQuantity || reason === undefined) {
            return res.status(400).json({
                message: "newQuantity and reason are required",
            });
        }

        const inventory = await inventoryService.adjustInventory(
            Number(itemId),
            Number(newQuantity),
            reason,
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


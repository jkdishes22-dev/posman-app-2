import { NextApiRequest, NextApiResponse } from "next";
import { InventoryService } from "@services/InventoryService";

const inventoryService = new InventoryService();

export const createInventoryItemHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const user_id = req.user.id;
        const newItem = await inventoryService.createInventoryItem(req.body, user_id);
        res.status(201).json(newItem);
    } catch (error) {
        console.error("Error creating inventory item:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const fetchInventoryItemsHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const items = await inventoryService.fetchInventoryItems();
        res.status(200).json(items);
    } catch (error) {
        console.error("Error fetching inventory items:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
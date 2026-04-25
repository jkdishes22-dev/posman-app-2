import { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "../../../../../src/backend/config/data-source";
import { ItemService } from "../../../../../src/backend/service/ItemService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        const { id } = req.query;

        if (!id || isNaN(Number(id))) {
            return res.status(400).json({ message: "Invalid item ID" });
        }

        const connection = await getConnection();
        const itemService = new ItemService(connection);

        const result = await itemService.getSubItemsForPlatter(Number(id));

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error: any) {
        console.error("Error fetching sub-items:", error);
        res.status(500).json({ message: "Some error occurred. Please try again." });
    }
}

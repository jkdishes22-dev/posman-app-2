import permissions from "@backend/config/permissions";
import { ItemService } from "@backend/service/ItemService";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        try {
            const itemService = new ItemService(req.db);
            const { stationId, categoryId, userId } = req.query;

            if (!stationId) {
                return res.status(400).json({ message: "Station ID is required" });
            }

            const items = await itemService.fetchItemsForStation(
                Number(stationId),
                categoryId ? Number(categoryId) : undefined,
                userId ? Number(userId) : undefined
            );

            res.status(200).json({
                message: "Items retrieved successfully",
                items,
                stationId: Number(stationId),
                categoryId: categoryId ? Number(categoryId) : null,
                count: items.length
            });
        } catch (error: any) {
            console.error("Error fetching station items:", error);
            res.status(500).json({ message: "Some error occurred. Please try again." });
        }
    } else {
        res.setHeader("Allow", ["GET"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

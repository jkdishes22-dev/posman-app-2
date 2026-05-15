import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { ItemService } from "@backend/service/ItemService";
import logger from "@backend/utils/logger";

const getTopSellingItems = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const { pricelistId, limit, lookbackDays } = req.query;

        if (!pricelistId) {
            return res.status(400).json({ message: "pricelistId is required" });
        }

        const itemService = new ItemService(req.db);
        const items = await itemService.fetchTopSellingItems(
            Number(pricelistId),
            limit ? Math.min(Number(limit), 50) : 10,
            lookbackDays ? Number(lookbackDays) : 30
        );

        logger.info({ pricelistId, limit, lookbackDays, userId: req.user?.id, count: items.length }, "Top selling items fetched");

        res.status(200).json({ items, count: items.length });
    } catch (error: any) {
        logger.error({ error: error.message, pricelistId: req.query.pricelistId, userId: req.user?.id }, "Failed to fetch top selling items");
        res.status(500).json({ message: "Some error occurred. Please try again." });
    }
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        return authMiddleware(authorize([permissions.CAN_ADD_BILL])(getTopSellingItems))(req, res);
    } else {
        res.setHeader("Allow", ["GET"]);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
};

export default withMiddleware(dbMiddleware)(handler);

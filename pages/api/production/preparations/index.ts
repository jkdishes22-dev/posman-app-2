import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { ProductionItemService } from "@backend/service/ProductionItemService";
import { ProductionSessionService } from "@backend/service/ProductionSessionService";
import { fetchAllProductionItemsHandler } from "@backend/controllers/ProductionItemController";
import { format } from "date-fns";

/**
 * POST /api/production/preparations — chef prepare page still calls this path.
 * Automatically resolves or creates today's open production bucket so the chef
 * flow works without needing to select a production manually.
 */
const issueWithAutoBucketHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const { item_id, quantity_prepared, quantity_produced, notes } = req.body;
    const qty = Number(quantity_prepared || quantity_produced);
    if (!item_id || !qty) return res.status(400).json({ message: "item_id and quantity are required" });

    const sessionSvc = new ProductionSessionService(req.db);
    const itemSvc = new ProductionItemService(req.db);

    // Use today's open production or create one
    const today = new Date();
    const todayName = `Production for ${format(today, "EEE, MMM do")}`;
    const { productions } = await sessionSvc.fetchProductions({
        status: "open" as any,
        start_date: new Date(today.setHours(0, 0, 0, 0)),
        end_date: new Date(today.setHours(23, 59, 59, 999)),
        limit: 1,
    });

    let production = productions[0];
    if (!production) {
        production = await sessionSvc.createProduction({ name: todayName }, userId);
    }

    try {
        const item = await itemSvc.issueItem(
            { production_id: production.id, item_id: Number(item_id), quantity_produced: qty, notes },
            userId,
        );
        res.status(201).json(item);
    } catch (error: any) {
        res.status(500).json({ error: error?.message || "Failed to issue production" });
    }
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        return authorize([permissions.CAN_VIEW_PRODUCTION_HISTORY])(fetchAllProductionItemsHandler)(req, res);
    } else if (req.method === "POST") {
        return authorize([permissions.CAN_ISSUE_PRODUCTION])(issueWithAutoBucketHandler)(req, res);
    } else {
        res.setHeader("Allow", ["GET", "POST"]);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

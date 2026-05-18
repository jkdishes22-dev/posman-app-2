import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { ProductionItemService } from "@backend/service/ProductionItemService";
import { ProductionSessionService } from "@backend/service/ProductionSessionService";
import { format } from "date-fns";

/**
 * Backward-compat shim: POST /api/production/preparations/issue-directly
 * Automatically resolves or creates today's open production bucket.
 * New code should POST to /api/production/runs/:id/items directly.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    return authorize([permissions.CAN_ISSUE_PRODUCTION])(async (req: NextApiRequest, res: NextApiResponse) => {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const { item_id, quantity_prepared, quantity_produced, notes, issue_date, production_id } = req.body;
        const qty = Number(quantity_prepared || quantity_produced);
        if (!item_id || !qty) return res.status(400).json({ message: "item_id and quantity are required" });

        const sessionSvc = new ProductionSessionService(req.db);
        const itemSvc = new ProductionItemService(req.db);

        let resolvedProductionId = production_id ? Number(production_id) : null;

        if (!resolvedProductionId) {
            const today = new Date();
            const todayName = `Production for ${format(today, "EEE, MMM do")}`;
            const { productions } = await sessionSvc.fetchProductions({
                status: "open" as any,
                start_date: new Date(new Date().setHours(0, 0, 0, 0)),
                end_date: new Date(new Date().setHours(23, 59, 59, 999)),
                limit: 1,
            });
            let production = productions[0];
            if (!production) {
                production = await sessionSvc.createProduction({ name: todayName }, userId);
            }
            resolvedProductionId = production.id;
        }

        let issuedAt: Date | undefined;
        if (issue_date) {
            const d = new Date(issue_date);
            if (!isNaN(d.getTime())) { d.setHours(0, 0, 0, 0); issuedAt = d; }
        }

        try {
            const item = await itemSvc.issueItem(
                { production_id: resolvedProductionId, item_id: Number(item_id), quantity_produced: qty, notes, issued_at: issuedAt },
                userId,
            );
            res.status(201).json(item);
        } catch (error: any) {
            res.status(500).json({ error: error?.message || "Failed to issue production" });
        }
    })(req, res);
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

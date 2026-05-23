import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import {
    issueProductionItemHandler,
    fetchProductionItemsHandler,
} from "@backend/controllers/ProductionItemController";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        return authorize([permissions.CAN_VIEW_PRODUCTION_HISTORY])(fetchProductionItemsHandler)(req, res);
    } else if (req.method === "POST") {
        return authorize([permissions.CAN_ISSUE_PRODUCTION])(issueProductionItemHandler)(req, res);
    } else {
        res.setHeader("Allow", ["GET", "POST"]);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

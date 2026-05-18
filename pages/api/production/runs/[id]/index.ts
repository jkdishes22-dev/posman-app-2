import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import {
    fetchProductionHandler,
    closeProductionHandler,
} from "@backend/controllers/ProductionSessionController";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        return authorize([permissions.CAN_VIEW_PRODUCTION_HISTORY])(fetchProductionHandler)(req, res);
    } else if (req.method === "PATCH") {
        return authorize([permissions.CAN_ISSUE_PRODUCTION])(closeProductionHandler)(req, res);
    } else {
        res.setHeader("Allow", ["GET", "PATCH"]);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

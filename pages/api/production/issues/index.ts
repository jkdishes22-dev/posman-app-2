import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import {
    fetchProductionIssuesHandler,
    createProductionIssueHandler,
} from "@backend/controllers/ProductionIssueController";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        return authorize([permissions.CAN_VIEW_INVENTORY])(fetchProductionIssuesHandler)(req, res);
    } else if (req.method === "POST") {
        return authorize([permissions.CAN_ADD_INVENTORY])(createProductionIssueHandler)(req, res);
    } else {
        res.setHeader("Allow", ["GET", "POST"]);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);


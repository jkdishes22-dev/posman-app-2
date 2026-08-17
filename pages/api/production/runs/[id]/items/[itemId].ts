import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import { updateProductionItemHandler, cancelProductionItemHandler } from "@backend/controllers/ProductionItemController";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "PUT") {
        return authorize([permissions.CAN_ISSUE_PRODUCTION])(updateProductionItemHandler)(req, res);
    } else if (req.method === "DELETE") {
        return authorize([permissions.CAN_ISSUE_PRODUCTION])(cancelProductionItemHandler)(req, res);
    } else {
        res.setHeader("Allow", ["PUT", "DELETE"]);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

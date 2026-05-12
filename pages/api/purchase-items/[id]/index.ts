import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import permissions from "@backend/config/permissions";
import {
    getPurchaseItemHandler,
    updatePurchaseItemHandler,
    deletePurchaseItemHandler,
} from "@backend/controllers/PurchaseItemController";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        return authorize([permissions.CAN_VIEW_PURCHASE_ORDER])(getPurchaseItemHandler)(req, res);
    } else if (req.method === "PUT") {
        return authorize([permissions.CAN_MANAGE_PURCHASE_ITEMS])(updatePurchaseItemHandler)(req, res);
    } else if (req.method === "DELETE") {
        return authorize([permissions.CAN_MANAGE_PURCHASE_ITEMS])(deletePurchaseItemHandler)(req, res);
    } else {
        res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

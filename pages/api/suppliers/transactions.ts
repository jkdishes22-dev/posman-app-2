import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import { listAllSupplierTransactionsHandler } from "@backend/controllers/SupplierController";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
    return authorize([permissions.CAN_VIEW_SUPPLIER])(listAllSupplierTransactionsHandler)(req, res);
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

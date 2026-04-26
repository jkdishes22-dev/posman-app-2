import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import {
    fetchSupplierHandler,
    updateSupplierHandler,
    deleteSupplierHandler,
    getSupplierBalanceHandler,
    getSupplierTransactionsHandler,
} from "@backend/controllers/SupplierController";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        const { action } = req.query;

        if (action === "balance") {
            return authorize([permissions.CAN_VIEW_SUPPLIER])(getSupplierBalanceHandler)(req, res);
        } else if (action === "transactions") {
            return authorize([permissions.CAN_VIEW_SUPPLIER])(getSupplierTransactionsHandler)(req, res);
        } else {
            return authorize([permissions.CAN_VIEW_SUPPLIER])(fetchSupplierHandler)(req, res);
        }
    } else if (req.method === "PATCH") {
        return authorize([permissions.CAN_EDIT_SUPPLIER])(updateSupplierHandler)(req, res);
    } else if (req.method === "DELETE") {
        return authorize([permissions.CAN_DELETE_SUPPLIER])(deleteSupplierHandler)(req, res);
    } else {
        res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);


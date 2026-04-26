import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import { recordSupplierCreditHandler } from "@backend/controllers/SupplierController";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "POST") {
        return authorize([permissions.CAN_ADD_SUPPLIER_PAYMENT])(recordSupplierCreditHandler)(req, res);
    }
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

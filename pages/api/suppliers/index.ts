import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import {
    fetchSuppliersHandler,
    createSupplierHandler,
} from "@backend/controllers/SupplierController";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        return authMiddleware(
            authorize([permissions.CAN_VIEW_SUPPLIER])(fetchSuppliersHandler),
        )(req, res);
    } else if (req.method === "POST") {
        return authMiddleware(
            authorize([permissions.CAN_ADD_SUPPLIER])(createSupplierHandler),
        )(req, res);
    } else {
        res.setHeader("Allow", ["GET", "POST"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default withMiddleware(dbMiddleware)(handler);


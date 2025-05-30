import permissions from "@backend/config/managed-roles";
import { bulkSubmitBills } from "@backend/controllers/BillController";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "POST") {
        return authMiddleware(
            authorize([permissions.CAN_ADD_BILL_PAYMENT])(bulkSubmitBills),
        )(req, res);
    }
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler); 
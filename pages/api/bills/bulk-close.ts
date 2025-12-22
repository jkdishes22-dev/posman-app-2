import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import { bulkCloseBills } from "@controllers/BillController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "POST") {
        await authMiddleware(authorize([permissions.CAN_EDIT_BILL])(bulkCloseBills))(
            req,
            res,
        );
    } else {
        res.setHeader("Allow", ["POST"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default withMiddleware(dbMiddleware)(handler);
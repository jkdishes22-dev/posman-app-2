import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/managed-roles";
import { getSubItemsForPlatterHandler } from "@backend/controllers/ItemController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        await authMiddleware(
            authorize([permissions.CAN_VIEW_ITEM])(getSubItemsForPlatterHandler),
        )(req, res);
    } else {
        res.setHeader("Allow", ["GET"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default withMiddleware(dbMiddleware)(handler);

import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { getSubItemsForPlatterHandler } from "@backend/controllers/ItemController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        await authorize([permissions.CAN_VIEW_ITEM])(getSubItemsForPlatterHandler)(req, res);
    } else {
        res.setHeader("Allow", ["GET"]);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

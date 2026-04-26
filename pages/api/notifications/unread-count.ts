import { authMiddleware } from "@backend/middleware/auth";
import { NextApiRequest, NextApiResponse } from "next";
import { getUnreadCount } from "@controllers/NotificationController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        await getUnreadCount(req, res);
    } else {
        res.setHeader("Allow", ["GET"]);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

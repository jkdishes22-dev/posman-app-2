import { authMiddleware } from "@backend/middleware/auth";
import { NextApiRequest, NextApiResponse } from "next";
import { markAsRead } from "@controllers/NotificationController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "POST") {
        await authMiddleware(markAsRead)(req, res);
    } else {
        res.setHeader("Allow", ["POST"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default withMiddleware(dbMiddleware)(handler);

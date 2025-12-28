import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import {
    fetchPreparationsHandler,
    createPreparationHandler,
} from "@backend/controllers/ProductionPreparationController";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        return authMiddleware(
            authorize([permissions.CAN_VIEW_PRODUCTION_HISTORY])(fetchPreparationsHandler),
        )(req, res);
    } else if (req.method === "POST") {
        return authMiddleware(
            authorize([permissions.CAN_ISSUE_PRODUCTION])(createPreparationHandler),
        )(req, res);
    } else {
        res.setHeader("Allow", ["GET", "POST"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default withMiddleware(dbMiddleware)(handler);


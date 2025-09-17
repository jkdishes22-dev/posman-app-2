import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/managed-roles";
import { NextApiRequest, NextApiResponse } from "next";
import { ReopenReasonService } from "@backend/service/ReopenReasonService";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        return authMiddleware(async (req: NextApiRequest, res: NextApiResponse) => {
            try {
                const reopenReasonService = new ReopenReasonService(req.db);
                const reasons = await reopenReasonService.getAllActiveReasons();

                res.status(200).json({
                    success: true,
                    reasons: reasons.map(reason => ({
                        id: reason.reason_key,
                        name: reason.name,
                        description: reason.description
                    }))
                });
            } catch (error: any) {
                console.error("Error fetching reopen reasons:", error);
                res.status(500).json({
                    success: false,
                    error: "Failed to fetch reopen reasons",
                    details: error.message
                });
            }
        })(req, res);
    } else {
        res.setHeader("Allow", ["GET"]);
        res.status(405).json({ error: "Method not allowed" });
    }
};

export default withMiddleware(dbMiddleware)(handler);
import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { UserService } from "@backend/service/UserService";
import { handleApiError } from "@backend/utils/errorHandler";
import permissions from "@backend/config/permissions";

/**
 * Returns users who can create bills (sales + supervisor roles).
 * Requires can_view_bill rather than can_view_user so cashiers and
 * supervisors can populate the salesperson filter dropdown without
 * needing full user-management access.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    return authorize([permissions.CAN_VIEW_BILL])(async (req, res) => {
        try {
            const service = new UserService(req.db);
            const { users } = await service.getUsers("sales,supervisor", 1, 500);
            res.status(200).json({ users });
        } catch (error: any) {
            const { userMessage, errorCode } = handleApiError(error, { operation: "fetching", resource: "billing staff" });
            res.status(500).json({ error: userMessage, code: errorCode });
        }
    })(req, res);
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

import { NextApiRequest, NextApiResponse } from "next";
import { BillService } from "@services/BillService";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { withMiddleware } from "@backend/middleware/middleware-util";

const requestVoidItem = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const { billId, itemId } = req.query;
        const { reason } = req.body;

        if (!billId || !itemId || !reason) {
            return res.status(400).json({
                error: "billId, itemId, and reason are required"
            });
        }

        const billService = new BillService(req.db);
        const userId = parseInt(req.user?.id as string);

        const result = await billService.requestVoidItem(
            parseInt(billId as string),
            parseInt(itemId as string),
            userId,
            reason.trim()
        );

        return res.status(200).json({
            message: "Void request submitted successfully",
            voidRequest: result
        });

    } catch (error) {
        console.error("Error requesting void item:", error);
        return res.status(500).json({
            error: "Internal server error",
            details: undefined
        });
    }
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "POST") {
        return authorize([permissions.CAN_EDIT_BILL])(requestVoidItem)(req, res);
    } else {
        res.setHeader("Allow", ["POST"]);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

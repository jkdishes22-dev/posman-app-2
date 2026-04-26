import { NextApiRequest, NextApiResponse } from "next";
import { BillService } from "@services/BillService";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { withMiddleware } from "@backend/middleware/middleware-util";

const approveVoidRequest = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const { billId, itemId } = req.query;
        const { action, approvalNotes, paperApprovalReceived } = req.body;

        if (!billId || !itemId || !action) {
            return res.status(400).json({
                error: "billId, itemId, and action are required"
            });
        }

        if (!["approve", "reject"].includes(action)) {
            return res.status(400).json({
                error: "action must be 'approve' or 'reject'"
            });
        }

        const billService = new BillService(req.db);
        const userId = parseInt(req.user?.id as string);

        const result = await billService.approveVoidRequest(
            parseInt(billId as string),
            parseInt(itemId as string),
            userId,
            action === "approve",
            approvalNotes?.trim(),
            paperApprovalReceived === true
        );

        return res.status(200).json({
            message: `Void request ${action}d successfully`,
            voidRequest: result
        });

    } catch (error) {
        console.error("Error approving void request:", error);
        return res.status(500).json({
            error: "Internal server error",
            details: undefined
        });
    }
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "POST") {
        return authorize([permissions.CAN_APPROVE_VOID])(approveVoidRequest)(req, res);
    } else {
        res.setHeader("Allow", ["POST"]);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

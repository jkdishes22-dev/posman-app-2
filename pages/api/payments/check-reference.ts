import { NextApiRequest, NextApiResponse } from "next";
import { PaymentService } from "../../../src/backend/service/PaymentService";
import permissions from "../../../src/backend/config/permissions";
import { authMiddleware, authorize } from "../../../src/backend/middleware/auth";
import { dbMiddleware } from "../../../src/backend/middleware/dbMiddleware";
import { withMiddleware } from "../../../src/backend/middleware/middleware-util";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    try {
        const { reference, billId } = req.body;

        if (!reference || !billId) {
            return res.status(400).json({ error: "Reference and billId are required" });
        }

        const paymentService = new PaymentService(req.db);

        // Check if M-Pesa reference already exists in another bill
        const exists = await paymentService.checkMpesaReferenceExists(reference, parseInt(billId));

        return res.status(200).json({
            exists: exists,
            message: exists
                ? "Reference already used in another bill"
                : "Reference is available"
        });

    } catch (error) {
        console.error("Error checking M-Pesa reference:", error);
        return res.status(500).json({
            error: "Internal server error",
            details: undefined
        });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(
    authorize([permissions.CAN_ADD_BILL])(handler),
);
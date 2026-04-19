import { NextApiRequest, NextApiResponse } from "next";
import { PaymentService } from "../../../../src/backend/service/PaymentService";
import { dbMiddleware } from "../../../../src/backend/middleware/dbMiddleware";
import { authMiddleware, authorize } from "../../../../src/backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { withMiddleware } from "../../../../src/backend/middleware/middleware-util";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { billId } = req.query;
        const { paymentType, creditAmount, reference } = req.body;

        if (!billId || !paymentType || !creditAmount) {
            return res.status(400).json({
                error: "billId, paymentType, and creditAmount are required"
            });
        }

        const paymentService = new PaymentService(req.db);

        // Create the payment
        const payment = await paymentService.createPayment({
            paymentType,
            creditAmount: parseFloat(creditAmount),
            reference: reference || null,
            paidAt: new Date(),
            created_at: new Date(),
            created_by: parseInt(req.user.id, 10),
        });

        // Create the bill payment relationship
        const billPayment = await paymentService.createBillPayment({
            bill: { id: parseInt(billId as string) },
            payment: payment,
            created_at: new Date(),
            created_by: parseInt(req.user.id, 10),
        });

        return res.status(200).json({
            message: "Payment added successfully",
            payment: payment,
            billPayment: billPayment
        });

    } catch (error) {
        console.error("Error adding payment to bill:", error);
        return res.status(500).json({
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

export default withMiddleware(dbMiddleware)(authMiddleware(authorize([permissions.CAN_ADD_BILL_PAYMENT])(handler)));

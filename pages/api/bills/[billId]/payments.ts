import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/managed-roles";
import { NextApiRequest, NextApiResponse } from "next";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { BillService } from "@backend/service/BillService";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "POST") {
        try {
            const billService = new BillService(req.db);
            const { billId } = req.query;
            const { paymentType, creditAmount, mpesaTransactionId } = req.body;

            if (!paymentType || !creditAmount) {
                return res.status(400).json({ error: "Payment type and amount are required" });
            }

            const result = await billService.addPayment(
                Number(billId),
                {
                    paymentType,
                    creditAmount: parseFloat(creditAmount),
                    mpesaTransactionId: mpesaTransactionId || null
                },
                parseInt(req.user?.id as string)
            );

            res.status(200).json({
                message: "Payment added successfully",
                payment: result
            });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    } else {
        res.setHeader("Allow", ["POST"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default withMiddleware(dbMiddleware)(authMiddleware(authorize([permissions.CAN_VIEW_BILL])(handler)));

import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/managed-roles";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { Payment } from "@backend/entities/Payment";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { reference } = req.query;

        if (!reference || typeof reference !== "string") {
            return res.status(400).json({ error: "Reference parameter is required" });
        }

        // Check if reference already exists
        const existingPayment = await req.db.getRepository(Payment).findOne({
            where: { reference: reference.trim() }
        });

        res.status(200).json({
            exists: !!existingPayment,
            reference: reference.trim()
        });
    } catch (error: any) {
        console.error("Error checking reference:", error);
        res.status(500).json({ error: "Failed to check reference" });
    }
};

export default withMiddleware(dbMiddleware)(authMiddleware(authorize([permissions.CAN_ADD_BILL])(handler)));

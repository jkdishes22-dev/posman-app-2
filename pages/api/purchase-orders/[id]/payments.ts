import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { SupplierPaymentService } from "@backend/service/SupplierPaymentService";
import { SupplierPaymentAction } from "@backend/entities/SupplierPayment";
import { handleApiError } from "@backend/utils/errorHandler";

const getPurchaseOrderPayments = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const poId = Number(req.query.id);
        if (!Number.isFinite(poId)) {
            return res.status(400).json({ message: "Invalid purchase order id" });
        }
        const service = new SupplierPaymentService(req.db);
        const payments = await service.getPaymentsForReference(SupplierPaymentAction.PURCHASE_ORDER, poId);
        return res.status(200).json(payments);
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "fetching",
            resource: "purchase order payments",
        });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        return authorize([permissions.CAN_VIEW_PURCHASE_ORDER])(getPurchaseOrderPayments)(req, res);
    }
    res.setHeader("Allow", ["GET"]);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

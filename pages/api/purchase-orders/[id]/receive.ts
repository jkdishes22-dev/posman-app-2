import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import { receivePurchaseOrderHandler } from "@backend/controllers/PurchaseOrderController";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    return authorize([permissions.CAN_RECEIVE_PURCHASE_ORDER])(receivePurchaseOrderHandler)(req, res);
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);


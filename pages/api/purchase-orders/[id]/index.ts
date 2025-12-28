import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import {
  fetchPurchaseOrderHandler,
  updatePurchaseOrderHandler,
} from "@backend/controllers/PurchaseOrderController";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    return authMiddleware(
      authorize([permissions.CAN_VIEW_PURCHASE_ORDER])(fetchPurchaseOrderHandler),
    )(req, res);
  } else if (req.method === "PATCH") {
    return authMiddleware(
      authorize([permissions.CAN_EDIT_PURCHASE_ORDER])(updatePurchaseOrderHandler),
    )(req, res);
  } else {
    res.setHeader("Allow", ["GET", "PATCH"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withMiddleware(dbMiddleware)(handler);


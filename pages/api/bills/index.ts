import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import {
  createBill,
  fetchBills,
  cancelBill,
  voidBillItem,
} from "@controllers/BillController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    return authorize([permissions.CAN_ADD_BILL])(createBill)(req, res);
  }

  if (req.method === "GET") {
    return authorize([permissions.CAN_VIEW_BILL])(fetchBills)(req, res);
  }

  if (req.method === "PATCH") {
    const { action } = req.query;
    if (action === "cancel") {
      return authorize([permissions.CAN_CANCEL_BILL])(cancelBill)(req, res);
    }
    if (action === "voidItem") {
      return authorize([permissions.CAN_EDIT_BILL])(voidBillItem)(req, res);
    }
  }

  res.setHeader("Allow", ["GET", "POST", "PATCH"]);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

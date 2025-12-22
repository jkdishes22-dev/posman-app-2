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
    return authMiddleware(authorize([permissions.CAN_ADD_BILL])(createBill))(
      req,
      res,
    );
  }

  if (req.method === "GET") {
    return authMiddleware(authorize([permissions.CAN_VIEW_BILL])(fetchBills))(
      req,
      res,
    );
  }

  if (req.method === "PATCH") {
    const { action } = req.query;
    if (action === "cancel") {
      return authMiddleware(authorize([permissions.CAN_EDIT_BILL])(cancelBill))(
        req,
        res,
      );
    }
    if (action === "voidItem") {
      return authMiddleware(
        authorize([permissions.CAN_EDIT_BILL])(voidBillItem),
      )(req, res);
    }
  }

  // Method not allowed
  res.setHeader("Allow", ["GET", "POST", "PATCH"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default withMiddleware(dbMiddleware)(handler);

import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/managed-roles";
import { createBill, fetchBills } from "@controllers/BillController";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    await authMiddleware(authorize([permissions.CAN_ADD_BILL])(createBill))(
      req,
      res,
    );
  } else if (req.method === "GET") {
    await authMiddleware(authorize([permissions.CAN_VIEW_BILL])(fetchBills))(
      req,
      res,
    );
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default handler;

import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import {
  requestVoidItem,
  getPendingVoidRequests,
} from "@controllers/BillController";
import permissions from "@backend/config/managed-roles";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    // Sales users can create void requests
    await authMiddleware(
      authorize([permissions.CAN_ADD_BILL])(requestVoidItem),
    )(req, res);
  } else if (req.method === "GET") {
    // Supervisors and cashiers can view pending requests
    await authMiddleware(
      authorize([permissions.CAN_VIEW_BILL, permissions.CAN_EDIT_BILL])(
        getPendingVoidRequests,
      ),
    )(req, res);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withMiddleware(dbMiddleware)(handler);

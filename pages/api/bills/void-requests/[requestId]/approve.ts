import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { approveVoidRequestHandler } from "@controllers/BillVoidController";
import permissions from "@backend/config/managed-roles";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    // Supervisors and cashiers can approve void requests
    await authMiddleware(
      authorize([permissions.CAN_EDIT_BILL])(approveVoidRequestHandler),
    )(req, res);
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withMiddleware(dbMiddleware)(handler);

import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { getQuantityChangeRequestStats } from "@controllers/BillController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    return authMiddleware(authorize([permissions.CAN_VIEW_BILL])(getQuantityChangeRequestStats))(
      req,
      res,
    );
  }

  // Method not allowed
  res.setHeader("Allow", ["GET"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default withMiddleware(dbMiddleware)(handler);


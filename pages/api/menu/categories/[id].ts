import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import { deleteCategoryHandler } from "@backend/controllers/CategoryController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "DELETE") {
    await authorize([permissions.CAN_DELETE_CATEGORY])(deleteCategoryHandler)(req, res);
  } else {
    res.setHeader("Allow", ["DELETE"]);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

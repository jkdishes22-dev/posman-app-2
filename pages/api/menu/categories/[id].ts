import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/managed-roles";
import { NextApiRequest, NextApiResponse } from "next";
import { deleteCategoryHandler } from "@backend/controllers/CategoryController";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "DELETE") {
    await authMiddleware(
      authorize([permissions.CAN_DELETE_CATEGORY])(deleteCategoryHandler),
    )(req, res);
  }
};

export default handler;

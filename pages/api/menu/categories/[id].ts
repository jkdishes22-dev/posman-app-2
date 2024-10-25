import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/managed-roles";
import { deleteCategoryHandler } from "@controllers/ItemController";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "DELETE") {
    await authMiddleware(
      authorize([permissions.CAN_DELETE_CATEGORY])(deleteCategoryHandler),
    )(req, res);
  }
};

export default handler;

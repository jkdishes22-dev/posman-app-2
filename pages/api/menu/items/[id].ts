import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/managed-roles";
import { updateItemHandler } from "@controllers/MenuController";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "PATCH") {
    await authMiddleware(
      authorize([permissions.CAN_EDIT_ITEM])(updateItemHandler),
    )(req, res);
  }
};

export default handler;

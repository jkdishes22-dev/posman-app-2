import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/managed-roles";
import { updateItemHandler } from "@controllers/ItemController";
import { NextApiRequest, NextApiResponse } from "next";
import { ensureMetadata } from "@backend/utils/metadata-hack";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  await ensureMetadata("Item");
  if (req.method === "PATCH") {
    await authMiddleware(
      authorize([permissions.CAN_EDIT_ITEM])(updateItemHandler),
    )(req, res);
  }
};

export default handler;

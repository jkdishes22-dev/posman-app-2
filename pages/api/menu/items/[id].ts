import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/managed-roles";
import { updateItemHandler } from "@controllers/ItemController";
import { NextApiRequest, NextApiResponse } from "next";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
// import { ensureMetadata } from "@backend/utils/metadata-hack";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // await ensureMetadata("Item");
  if (req.method === "PATCH") {
    await authMiddleware(
      authorize([permissions.CAN_EDIT_ITEM])(updateItemHandler),
    )(req, res);
  }
};

export default withMiddleware(
  dbMiddleware,
  authMiddleware
)(handler);

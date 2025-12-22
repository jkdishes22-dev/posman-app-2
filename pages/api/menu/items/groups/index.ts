import { NextApiRequest, NextApiResponse } from "next";
// import { ensureMetadata } from "@backend/utils/metadata-hack";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { fetchGroupedItemsHandler, createGroupItemHandler } from "@controllers/ItemController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // await ensureMetadata("Item");
  if (req.method === "GET") {
    await authMiddleware(
      authorize([permissions.CAN_VIEW_ITEM])(fetchGroupedItemsHandler),
    )(req, res);
  } else if (req.method === "POST") {
    await authMiddleware(
      authorize([permissions.CAN_ADD_ITEM])(createGroupItemHandler),
    )(req, res);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withMiddleware(dbMiddleware)(handler);

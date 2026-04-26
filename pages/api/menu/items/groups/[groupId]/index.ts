import { NextApiRequest, NextApiResponse } from "next";
// import { ensureMetadata } from "@backend/utils/metadata-hack";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import {
  createGroupItemHandler,
  fetchGroupedItemsHandler,
} from "@backend/controllers/ItemController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // await ensureMetadata("Item");

  if (req.method === "POST") {
    await authorize([permissions.CAN_ADD_ITEM])(createGroupItemHandler)(req, res);
  } else if (req.method === "GET") {
    await authorize([permissions.CAN_ADD_ITEM])(fetchGroupedItemsHandler)(req, res);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

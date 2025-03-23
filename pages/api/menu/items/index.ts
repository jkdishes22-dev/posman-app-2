import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/managed-roles";
import { NextApiRequest, NextApiResponse } from "next";
import {
  createItemHandler,
  fetchItemsHandler,
  filterItemsHandler, // Import the new handler
} from "@controllers/ItemController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
// import { ensureMetadata } from "@backend/utils/metadata-hack";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // await ensureMetadata("Item");
  if (req.method === "GET") {
    const { search } = req.query;
    if (req.query && search) {
      await authMiddleware(
        authorize([permissions.CAN_VIEW_ITEM])(filterItemsHandler),
      )(req, res);
    } else {
      await authMiddleware(
        authorize([permissions.CAN_VIEW_ITEM])(fetchItemsHandler),
      )(req, res);
    }
  } else if (req.method === "POST") {
    await authMiddleware(
      authorize([permissions.CAN_ADD_ITEM])(createItemHandler),
    )(req, res);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withMiddleware(
  dbMiddleware,
  authMiddleware
)(handler);


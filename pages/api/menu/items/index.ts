import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import {
  createItemHandler,
  fetchItemsHandler,
  fetchAllItemsWithDetailsHandler,
  filterItemsHandler,
} from "@controllers/ItemController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    const { search, all } = req.query;
    if (all === "true") {
      await authorize([permissions.CAN_VIEW_ITEM])(fetchAllItemsWithDetailsHandler)(req, res);
    } else if (req.query && search) {
      await authorize([permissions.CAN_VIEW_ITEM])(filterItemsHandler)(req, res);
    } else {
      await authorize([permissions.CAN_VIEW_ITEM])(fetchItemsHandler)(req, res);
    }
  } else if (req.method === "POST") {
    await authorize([permissions.CAN_ADD_ITEM])(createItemHandler)(req, res);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import { updateItemCategoryHandler } from "@controllers/ItemController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "PATCH") {
    // Map [id] query param to itemId for the handler
    req.query.itemId = req.query.id;
    return authorize([permissions.CAN_EDIT_ITEM])(updateItemCategoryHandler)(req, res);
  } else {
    res.setHeader("Allow", ["PATCH"]);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

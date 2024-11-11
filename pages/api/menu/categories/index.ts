import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/managed-roles";
import { NextApiRequest, NextApiResponse } from "next";
import {
  createCategoryHandler,
  fetchCategoriesHandler,
} from "@controllers/ItemController";
import { ensureMetadata } from "@backend/utils/metadata-hack";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  await ensureMetadata("Category");

  if (req.method === "GET") {
    await authMiddleware(
      authorize([permissions.CAN_VIEW_CATEGORY])(fetchCategoriesHandler),
    )(req, res);
  } else if (req.method === "POST") {
    await authMiddleware(
      authorize([permissions.CAN_ADD_CATEGORY])(createCategoryHandler),
    )(req, res);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default handler;

import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { downloadTemplateHandler } from "@backend/controllers/PricelistUploadController";
import permissions from "@backend/config/permissions";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    return authorize([permissions.CAN_ADD_ITEM])(downloadTemplateHandler)(req, res);
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

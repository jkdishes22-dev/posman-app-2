import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import permissions from "@backend/config/permissions";
import { validateUploadFileHandler } from "@backend/controllers/PricelistUploadController";

export const config = {
  api: {
    bodyParser: false,
  },
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    return authorize([permissions.CAN_ADD_ITEM])(validateUploadFileHandler)(req, res);
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);


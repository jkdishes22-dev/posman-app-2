import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import {
  createUserHandler,
  getUsersHandler,
} from "@controllers/UserController";
import { config } from "dotenv";
import permissions from "@backend/config/managed-roles";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import * as process from "process";

config();
const isAuthEnabled = (process.env.AUTH_ENABLED as string) || "false";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    if (isAuthEnabled === "true") {
      await authMiddleware(
        authorize([permissions.CAN_ADD_USER])(createUserHandler),
      )(req, res);
    } else {
      await createUserHandler(req, res);
    }
  } else if (req.method === "GET") {
    await authMiddleware(
      authorize([permissions.CAN_VIEW_USER])(getUsersHandler),
    )(req, res);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.setHeader("Content-Type", "application/json");
    res.status(405).json({
      error: "Method Not Allowed",
      message: `Method ${req.method} is not supported`,
      allowedMethods: ["GET", "POST"]
    });
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

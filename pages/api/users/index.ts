import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import {
  createUserHandler,
  getUsersHandler,
} from "@controllers/UserController";
import { config } from "dotenv";
import * as process from "process";
import { ensureMetadata } from "@backend/utils/metadata-hack";
import permissions from "@backend/config/managed-roles";

config();
const isAuthEnabled = process.env.AUTH_ENABLED || "false";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  await ensureMetadata("User");
  await ensureMetadata("Role");
  await ensureMetadata("Permission");
  await ensureMetadata("UserRole");
  await ensureMetadata("RolePermission");

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
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default handler;

import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/managed-roles";
import { NextApiRequest, NextApiResponse } from "next";
import {
  fetchRolesHandler,
  createRoleHandler,
  addPermissionToRoleHandler,
  assignRoleToUserHandler,
} from "@controllers/RoleController";
// import { ensureMetadata } from "@backend/utils/metadata-hack";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // await ensureMetadata("Role");
  if (req.method === "GET") {
    await authMiddleware(
      authorize([permissions.CAN_VIEW_ROLE])(fetchRolesHandler),
    )(req, res);
  } else if (req.method === "POST") {
    await authMiddleware(
      authorize([permissions.CAN_ADD_ROLE])(createRoleHandler),
    )(req, res);
  } else if (req.method === "PATCH") {
    if (req.body.action === "addPermission") {
      await authMiddleware(
        authorize([permissions.CAN_MANAGE_ROLE])(addPermissionToRoleHandler),
      )(req, res);
    } else if (req.body.action === "assignRole") {
      await authMiddleware(
        authorize([permissions.CAN_MANAGE_ROLE])(assignRoleToUserHandler),
      )(req, res);
    } else {
      res.status(400).json({ message: "Invalid action" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST", "PATCH"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default handler;

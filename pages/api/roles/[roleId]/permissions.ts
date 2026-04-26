import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import {
  addPermissionToRoleHandler,
  fetchPermissionsByRoleHandler,
  removePermissionFromRoleHandler,
} from "@controllers/RoleController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { cache } from "@backend/utils/cache";
// import { ensureMetadata } from "@backend/utils/metadata-hack";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // await ensureMetadata("Permission");
  if (req.method === "GET") {
    await authorize([permissions.CAN_VIEW_PERMISSION])(fetchPermissionsByRoleHandler)(req, res);
  } else if (req.method === "POST") {
    // Invalidate cache when adding permission to role
    const { roleId } = req.body;
    if (roleId) {
      cache.invalidate(`role_permissions_${roleId}`);
      cache.invalidate("roles");
      cache.invalidate("api_roles");
    }
    await authorize([permissions.CAN_ADD_PERMISSION])(addPermissionToRoleHandler)(req, res);
  } else if (req.method === "DELETE") {
    // Invalidate cache when removing permission from role
    const { roleId } = req.body;
    if (roleId) {
      cache.invalidate(`role_permissions_${roleId}`);
      cache.invalidate("roles");
      cache.invalidate("api_roles");
    }
    await authorize([permissions.CAN_DELETE_PERMISSION])(removePermissionFromRoleHandler)(req, res);
  } else {
    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

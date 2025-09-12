import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/managed-roles";
import { NextApiRequest, NextApiResponse } from "next";
import {
  fetchRolesHandler,
  createRoleHandler,
  addPermissionToRoleHandler,
  assignRoleToUserHandler,
} from "@controllers/RoleController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
// import { ensureMetadata } from "@backend/utils/metadata-hack";

// Simple in-memory cache for roles
let rolesCache: any[] | null = null;
let rolesCacheTimestamp: number = 0;
const ROLES_CACHE_DURATION = 30000; // 30 seconds

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // await ensureMetadata("Role");
  if (req.method === "GET") {
    // Check cache first
    const now = Date.now();
    if (rolesCache && (now - rolesCacheTimestamp) < ROLES_CACHE_DURATION) {
      return res.status(200).json(rolesCache);
    }

    // Cache miss or expired, fetch from database
    const originalJson = res.json;
    res.json = function (data: any) {
      if (res.statusCode === 200) {
        rolesCache = data;
        rolesCacheTimestamp = now;
      }
      return originalJson.call(this, data);
    };

    await authMiddleware(
      authorize([permissions.CAN_VIEW_ROLE])(fetchRolesHandler),
    )(req, res);
  } else if (req.method === "POST") {
    // Clear cache when adding new role
    rolesCache = null;
    await authMiddleware(
      authorize([permissions.CAN_ADD_ROLE])(createRoleHandler),
    )(req, res);
  } else if (req.method === "PATCH") {
    // Clear cache when modifying roles
    rolesCache = null;
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

export default withMiddleware(dbMiddleware)(handler);

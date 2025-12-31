import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import {
  fetchRolesHandler,
  createRoleHandler,
  addPermissionToRoleHandler,
  assignRoleToUserHandler,
} from "@controllers/RoleController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { cache } from "@backend/utils/cache";
// import { ensureMetadata } from "@backend/utils/metadata-hack";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // await ensureMetadata("Role");
  if (req.method === "GET") {
    // Check cache first (using shared cache utility) - BEFORE any middleware
    const cacheKey = "api_roles_all";
    const cached = cache.get<any[]>(cacheKey);
    if (cached !== null) {
      // Set cache headers for browser caching
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
      res.setHeader("ETag", `"roles-${Date.now()}"`);
      return res.status(200).json(cached);
    }

    // Cache miss, fetch from database
    const originalJson = res.json;
    res.json = function (data: any) {
      if (res.statusCode === 200) {
        // Cache the result (using shared cache utility)
        cache.set(cacheKey, data);
        // Set cache headers
        res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
        res.setHeader("ETag", `"roles-${Date.now()}"`);
      }
      return originalJson.call(this, data);
    };

    await authMiddleware(
      authorize([permissions.CAN_VIEW_ROLE])(fetchRolesHandler),
    )(req, res);
  } else if (req.method === "POST") {
    // Invalidate cache when adding new role
    cache.invalidate("roles");
    cache.invalidate("api_roles");
    await authMiddleware(
      authorize([permissions.CAN_ADD_ROLE])(createRoleHandler),
    )(req, res);
  } else if (req.method === "PATCH") {
    // Invalidate cache when modifying roles
    cache.invalidate("roles");
    cache.invalidate("api_roles");
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

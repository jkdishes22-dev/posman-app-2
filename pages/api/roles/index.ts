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

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    return authorize([permissions.CAN_VIEW_ROLE])(async (req, res) => {
      const cacheKey = "api_roles_all";
      const cached = cache.get<any[]>(cacheKey);
      if (cached !== null) {
        res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
        res.setHeader("ETag", `"roles-${Date.now()}"`);
        return res.status(200).json(cached);
      }

      const origJson = res.json;
      res.json = function (data: any) {
        if (res.statusCode === 200) {
          cache.set(cacheKey, data);
          res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
          res.setHeader("ETag", `"roles-${Date.now()}"`);
        }
        return origJson.call(this, data);
      };

      return fetchRolesHandler(req, res);
    })(req, res);
  } else if (req.method === "POST") {
    cache.invalidate("roles");
    cache.invalidate("api_roles");
    return authorize([permissions.CAN_ADD_ROLE])(createRoleHandler)(req, res);
  } else if (req.method === "PATCH") {
    cache.invalidate("roles");
    cache.invalidate("api_roles");
    if (req.body.action === "addPermission") {
      return authorize([permissions.CAN_MANAGE_ROLE])(addPermissionToRoleHandler)(req, res);
    } else if (req.body.action === "assignRole") {
      return authorize([permissions.CAN_MANAGE_ROLE])(assignRoleToUserHandler)(req, res);
    } else {
      res.status(400).json({ message: "Invalid action" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST", "PATCH"]);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);
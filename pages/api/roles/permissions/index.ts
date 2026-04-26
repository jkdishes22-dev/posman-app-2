import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import {
  fetchPermissionsHandler,
  createPermissionHandler,
} from "@controllers/PermissionController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { cache } from "@backend/utils/cache";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    return authorize([permissions.CAN_VIEW_PERMISSION])(async (req, res) => {
      const cacheKey = "api_permissions_all";
      const cached = cache.get<any[]>(cacheKey);
      if (cached !== null) {
        res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
        res.setHeader("ETag", `"permissions-${Date.now()}"`);
        return res.status(200).json(cached);
      }

      const origJson = res.json;
      res.json = function (data: any) {
        if (res.statusCode === 200) {
          cache.set(cacheKey, data);
          res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
          res.setHeader("ETag", `"permissions-${Date.now()}"`);
        }
        return origJson.call(this, data);
      };

      return fetchPermissionsHandler(req, res);
    })(req, res);
  } else if (req.method === "POST") {
    cache.invalidate("permissions");
    cache.invalidate("api_permissions");
    return authorize([permissions.CAN_ADD_PERMISSION])(createPermissionHandler)(req, res);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);
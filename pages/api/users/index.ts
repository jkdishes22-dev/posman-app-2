import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize, authorizeAny } from "@backend/middleware/auth";
import {
  createUserHandler,
  getUsersHandler,
  deleteUserHandler,
  reactivateUserHandler,
  updateOrLockUserHandler,
} from "@controllers/UserController";
import permissions from "@backend/config/permissions";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { cache } from "@backend/utils/cache";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    cache.invalidate("users");
    return authorize([permissions.CAN_ADD_USER])(createUserHandler)(req, res);
  } else if (req.method === "GET") {
    // User list is needed for User Management (CAN_VIEW_USER) and Station Users UI
    // (supervisors often have user–station permissions without full user view).
    return authorizeAny([
      permissions.CAN_VIEW_USER,
      permissions.CAN_VIEW_USER_STATION,
      permissions.CAN_ADD_USER_STATION,
      permissions.CAN_EDIT_USER_STATION,
      permissions.CAN_DELETE_USER_STATION,
    ])(async (req, res) => {
      const search = Array.isArray(req.query.search) ? req.query.search[0] : req.query.search;
      const role = Array.isArray(req.query.role) ? req.query.role[0] : req.query.role;
      const page = req.query.page || 1;
      const pageSize = req.query.pageSize || 10;

      if (!search) {
        const cacheKey = `api_users_${role || "all"}_${page}_${pageSize}`;
        const cached = cache.get<any>(cacheKey);
        if (cached !== null) {
          res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
          res.setHeader("ETag", `"users-${Date.now()}"`);
          return res.status(200).json(cached);
        }

        const origJson = res.json;
        res.json = function (data: any) {
          if (res.statusCode === 200) {
            cache.set(cacheKey, data);
            res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
            res.setHeader("ETag", `"users-${Date.now()}"`);
          }
          return origJson.call(this, data);
        };
      }

      return getUsersHandler(req, res);
    })(req, res);
  } else if (req.method === "DELETE") {
    cache.invalidate("users");
    return authorize([permissions.CAN_DELETE_USER])(deleteUserHandler)(req, res);
  } else if (req.method === "PATCH") {
    cache.invalidate("users");
    if (req.body.action === "reactivate") {
      return authorize([permissions.CAN_EDIT_USER])(reactivateUserHandler)(req, res);
    } else if (["update", "lock", "unlock"].includes(req.body.action)) {
      return authorize([permissions.CAN_EDIT_USER])(updateOrLockUserHandler)(req, res);
    } else {
      res.status(400).json({ error: "Invalid action" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST", "DELETE", "PATCH"]);
    res.setHeader("Content-Type", "application/json");
    res.status(405).json({
      error: "Method Not Allowed",
      message: `Method ${req.method} is not supported`,
      allowedMethods: ["GET", "POST", "DELETE", "PATCH"]
    });
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);
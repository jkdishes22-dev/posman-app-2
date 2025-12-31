import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import {
  createUserHandler,
  getUsersHandler,
  deleteUserHandler,
  reactivateUserHandler,
  updateOrLockUserHandler,
} from "@controllers/UserController";
import { config } from "dotenv";
import permissions from "@backend/config/permissions";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { cache } from "@backend/utils/cache";
import * as process from "process";

config();
const isAuthEnabled = (process.env.AUTH_ENABLED as string) || "false";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    // Invalidate cache when adding new user
    cache.invalidate("users");
    if (isAuthEnabled === "true") {
      await authMiddleware(
        authorize([permissions.CAN_ADD_USER])(createUserHandler),
      )(req, res);
    } else {
      await createUserHandler(req, res);
    }
  } else if (req.method === "GET") {
    // Check cache first (using shared cache utility)
    const search = Array.isArray(req.query.search) ? req.query.search[0] : req.query.search;
    const role = Array.isArray(req.query.role) ? req.query.role[0] : req.query.role;
    const page = req.query.page || 1;
    const pageSize = req.query.pageSize || 10;
    
    // Only cache non-search queries (search results change frequently)
    if (!search) {
      const cacheKey = `api_users_${role || "all"}_${page}_${pageSize}`;
      const cached = cache.get<any>(cacheKey);
      if (cached !== null) {
        // Set cache headers for browser caching
        res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
        res.setHeader("ETag", `"users-${Date.now()}"`);
        return res.status(200).json(cached);
      }
    }

    // Cache miss or search query, fetch from database
    const originalJson = res.json;
    res.json = function (data: any) {
      if (res.statusCode === 200) {
        // Cache the result (only for non-search queries, using shared cache utility)
        if (!search) {
          const cacheKey = `api_users_${role || "all"}_${page}_${pageSize}`;
          cache.set(cacheKey, data);
          // Set cache headers
          res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
          res.setHeader("ETag", `"users-${Date.now()}"`);
        }
      }
      return originalJson.call(this, data);
    };

    await authMiddleware(
      authorize([permissions.CAN_VIEW_USER])(getUsersHandler),
    )(req, res);
  } else if (req.method === "DELETE") {
    // Invalidate cache when deleting user
    cache.invalidate("users");
    await authMiddleware(
      authorize([permissions.CAN_DELETE_USER])(deleteUserHandler),
    )(req, res);
  } else if (req.method === "PATCH") {
    // Invalidate cache when modifying users
    cache.invalidate("users");
    if (req.body.action === "reactivate") {
      await authMiddleware(
        authorize([permissions.CAN_EDIT_USER])(reactivateUserHandler),
      )(req, res);
    } else if (["update", "lock", "unlock"].includes(req.body.action)) {
      await authMiddleware(
        authorize([permissions.CAN_EDIT_USER])(updateOrLockUserHandler),
      )(req, res);
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

export default withMiddleware(dbMiddleware)(handler);

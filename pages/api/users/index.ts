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
import permissions from "@backend/config/managed-roles";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import * as process from "process";

config();
const isAuthEnabled = (process.env.AUTH_ENABLED as string) || "false";

// Simple in-memory cache for users
let usersCache: any = null;
let usersCacheTimestamp: number = 0;
const USERS_CACHE_DURATION = 30000; // 30 seconds

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    // Clear cache when adding new user
    usersCache = null;
    if (isAuthEnabled === "true") {
      await authMiddleware(
        authorize([permissions.CAN_ADD_USER])(createUserHandler),
      )(req, res);
    } else {
      await createUserHandler(req, res);
    }
  } else if (req.method === "GET") {
    // Check cache first
    const now = Date.now();
    const search = Array.isArray(req.query.search) ? req.query.search[0] : req.query.search;
    const cacheKey = `${req.query.page || 1}_${req.query.pageSize || 10}_${search || ''}`;

    if (usersCache && usersCache[cacheKey] && (now - usersCacheTimestamp) < USERS_CACHE_DURATION) {
      return res.status(200).json(usersCache[cacheKey]);
    }

    // Cache miss or expired, fetch from database
    const originalJson = res.json;
    res.json = function (data: any) {
      if (res.statusCode === 200) {
        if (!usersCache) usersCache = {};
        usersCache[cacheKey] = data;
        usersCacheTimestamp = now;
      }
      return originalJson.call(this, data);
    };

    await authMiddleware(
      authorize([permissions.CAN_VIEW_USER])(getUsersHandler),
    )(req, res);
  } else if (req.method === "DELETE") {
    // Clear cache when deleting user
    usersCache = null;
    await authMiddleware(
      authorize([permissions.CAN_DELETE_USER])(deleteUserHandler),
    )(req, res);
  } else if (req.method === "PATCH") {
    // Clear cache when modifying users
    usersCache = null;
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

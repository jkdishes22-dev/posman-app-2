import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
// import { ensureMetadata } from "@backend/utils/metadata-hack";
import {
  fetchCategoriesHandler,
  createCategoryHandler,
} from "@backend/controllers/CategoryController";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";

// Simple in-memory cache for categories
const categoriesCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 60 seconds

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // await ensureMetadata("Category");
  if (req.method === "GET") {
    // Check cache first
    const cacheKey = "categories-all";
    const cached = categoriesCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return res.status(200).json(cached.data);
    }

    // If not cached, fetch and cache
    const originalJson = res.json;
    res.json = function (data: any) {
      categoriesCache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });
      return originalJson.call(this, data);
    };

    return authMiddleware(
      authorize([permissions.CAN_VIEW_CATEGORY])(fetchCategoriesHandler),
    )(req, res);
  } else if (req.method === "POST") {
    // Invalidate cache when creating new category
    categoriesCache.delete("categories-all");

    return authMiddleware(
      authorize([permissions.CAN_ADD_CATEGORY])(createCategoryHandler),
    )(req, res);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withMiddleware(dbMiddleware)(handler);

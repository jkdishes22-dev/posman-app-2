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
import { cache } from "@backend/utils/cache";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // await ensureMetadata("Category");
  if (req.method === "GET") {
    // Check cache first (using shared cache utility)
    const cacheKey = "api_categories_all";
    const cached = cache.get<any[]>(cacheKey);
    if (cached !== null) {
      // Set cache headers for browser caching (longer TTL for better performance)
      res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
      res.setHeader("ETag", `"categories"`);
      return res.status(200).json(cached);
    }

    // Cache miss, fetch from database
    const originalJson = res.json;
    res.json = function (data: any) {
      if (res.statusCode === 200) {
        // Cache the result (using shared cache utility)
        cache.set(cacheKey, data);
        // Set cache headers (longer TTL for better performance)
        res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
        res.setHeader("ETag", `"categories"`);
      }
      return originalJson.call(this, data);
    };

    return authMiddleware(
      authorize([permissions.CAN_VIEW_CATEGORY])(fetchCategoriesHandler),
    )(req, res);
  } else if (req.method === "POST") {
    // Invalidate cache when creating new category
    cache.invalidate("categories");
    cache.invalidate("api_categories");

    return authMiddleware(
      authorize([permissions.CAN_ADD_CATEGORY])(createCategoryHandler),
    )(req, res);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withMiddleware(dbMiddleware)(handler);

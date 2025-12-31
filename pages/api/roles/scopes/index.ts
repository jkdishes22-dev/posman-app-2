import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
// import { ensureMetadata } from "@backend/utils/metadata-hack";
import { fetchScopesHandler } from "@backend/controllers/ScopeController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { cache } from "@backend/utils/cache";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // await ensureMetadata("Scope");
  if (req.method === "GET") {
    // Check cache first (using shared cache utility) - BEFORE any middleware
    const cacheKey = "api_scopes_all";
    const cached = cache.get<any[]>(cacheKey);
    if (cached !== null) {
      // Set cache headers for browser caching
      res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
      res.setHeader("ETag", `"scopes-${Date.now()}"`);
      return res.status(200).json(cached);
    }

    // Cache miss, fetch from database
    const originalJson = res.json;
    res.json = function (data: any) {
      if (res.statusCode === 200) {
        // Cache the result (using shared cache utility)
        cache.set(cacheKey, data);
        // Set cache headers
        res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
        res.setHeader("ETag", `"scopes-${Date.now()}"`);
      }
      return originalJson.call(this, data);
    };

    await authMiddleware(
      authorize([permissions.CAN_VIEW_PERMISSION])(fetchScopesHandler),
    )(req, res);
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withMiddleware(dbMiddleware)(handler);

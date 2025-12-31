import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import { fetchScopePermisionsHandler } from "@backend/controllers/ScopeController";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { cache } from "@backend/utils/cache";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    const { scopeId } = req.query;
    
    // Check cache first (using shared cache utility)
    const cacheKey = `api_scope_permissions_${scopeId}`;
    const cached = cache.get<any[]>(cacheKey);
    if (cached !== null) {
      return res.status(200).json(cached);
    }

    // Cache miss, fetch from database
    const originalJson = res.json;
    res.json = function (data: any) {
      if (res.statusCode === 200) {
        // Cache the result (using shared cache utility)
        cache.set(cacheKey, data);
      }
      return originalJson.call(this, data);
    };

    await authMiddleware(
      authorize([permissions.CAN_VIEW_PERMISSION])(fetchScopePermisionsHandler),
    )(req, res);
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withMiddleware(dbMiddleware)(handler);

import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
// import { ensureMetadata } from "@backend/utils/metadata-hack";
import { fetchScopesHandler } from "@backend/controllers/ScopeController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";

// Simple in-memory cache for scopes
let scopesCache: any[] | null = null;
let scopesCacheTimestamp: number = 0;
const SCOPES_CACHE_DURATION = 60000; // 60 seconds (scopes change less frequently)

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // await ensureMetadata("Scope");
  if (req.method === "GET") {
    // Check cache first
    const now = Date.now();
    if (scopesCache && (now - scopesCacheTimestamp) < SCOPES_CACHE_DURATION) {
      return res.status(200).json(scopesCache);
    }

    // Cache miss or expired, fetch from database
    const originalJson = res.json;
    res.json = function (data: any) {
      if (res.statusCode === 200) {
        scopesCache = data;
        scopesCacheTimestamp = now;
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

import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import {
  createPricelistHandler,
  fetchPricelistsHandler,
} from "@controllers/PricelistController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
// import { ensureMetadata } from "@backend/utils/metadata-hack";

// Simple in-memory cache for pricelists
const pricelistsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 60 seconds

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // await ensureMetadata("Pricelist");

  if (req.method === "GET") {
    // Check cache first
    const cacheKey = "pricelists-all";
    const cached = pricelistsCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return res.status(200).json(cached.data);
    }

    // If not cached, fetch and cache
    const originalJson = res.json;
    res.json = function (data: any) {
      pricelistsCache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });
      return originalJson.call(this, data);
    };

    return authMiddleware(
      authorize([permissions.CAN_VIEW_PRICELIST])(fetchPricelistsHandler),
    )(req, res);
  } else if (req.method === "POST") {
    // Invalidate cache when creating new pricelist
    pricelistsCache.delete("pricelists-all");

    return authMiddleware(
      authorize([permissions.CAN_ADD_PRICELIST])(createPricelistHandler),
    )(req, res);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withMiddleware(dbMiddleware)(handler);

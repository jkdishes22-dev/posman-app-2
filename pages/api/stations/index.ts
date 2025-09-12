import permissions from "@backend/config/managed-roles";
import {
  addStationHandler,
  fetchStationsHandler,
} from "@backend/controllers/StationController";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
// import { ensureMetadata } from "@backend/utils/metadata-hack";
import { NextApiRequest, NextApiResponse } from "next";

// Simple in-memory cache for stations
let stationsCache: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30000; // 30 seconds

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // await ensureMetadata("Station");

  if (req.method === "POST") {
    // Clear cache when adding new station
    stationsCache = null;
    await authMiddleware(
      authorize([permissions.CAN_ADD_STATION])(addStationHandler),
    )(req, res);
  }
  if (req.method === "GET") {
    // Check cache first
    const now = Date.now();
    if (stationsCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return res.status(200).json(stationsCache);
    }

    // Cache miss or expired, fetch from database
    const originalJson = res.json;
    res.json = function (data: any) {
      if (res.statusCode === 200) {
        stationsCache = data;
        cacheTimestamp = now;
      }
      return originalJson.call(this, data);
    };

    await authMiddleware(
      authorize([permissions.CAN_VIEW_STATION])(fetchStationsHandler),
    )(req, res);
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

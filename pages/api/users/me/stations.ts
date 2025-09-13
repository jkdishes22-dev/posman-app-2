import permissions from "@backend/config/managed-roles";
import { StationService } from "@backend/service/StationService";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { NextApiRequest, NextApiResponse } from "next";

// Simple in-memory cache for user stations
const userStationsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: "User not authenticated" });
            }

            // Check cache first
            const cacheKey = `user-stations-${userId}`;
            const cached = userStationsCache.get(cacheKey);

            if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
                return res.status(200).json(cached.data);
            }

            const stationService = new StationService(req.db);
            const stations = await stationService.getUserStations(Number(userId));

            const response = {
                message: "User stations retrieved successfully",
                stations
            };

            // Cache the response
            userStationsCache.set(cacheKey, {
                data: response,
                timestamp: Date.now()
            });

            res.status(200).json(response);
        } catch (error: any) {
            console.error("Error fetching user stations:", error);
            res.status(500).json({
                message: "Error fetching user stations",
                error: error.message,
            });
        }
    } else {
        res.setHeader("Allow", ["GET"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

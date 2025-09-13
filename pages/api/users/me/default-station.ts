import permissions from "@backend/config/managed-roles";
import { StationService } from "@backend/service/StationService";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { NextApiRequest, NextApiResponse } from "next";

// Simple in-memory cache for default station
const defaultStationCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: "User not authenticated" });
            }

            // Check cache first
            const cacheKey = `default-station-${userId}`;
            const cached = defaultStationCache.get(cacheKey);

            if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
                return res.status(200).json(cached.data);
            }

            const stationService = new StationService(req.db);
            const defaultStation = await stationService.getUserDefaultStation(Number(userId));

            let response;
            if (!defaultStation) {
                response = {
                    message: "No default station found for user",
                    hasDefaultStation: false
                };
            } else {
                response = {
                    message: "Default station retrieved successfully",
                    hasDefaultStation: true,
                    station: defaultStation
                };
            }

            // Cache the response
            defaultStationCache.set(cacheKey, {
                data: response,
                timestamp: Date.now()
            });

            res.status(200).json(response);
        } catch (error: any) {
            console.error("Error fetching user default station:", error);
            res.status(500).json({
                message: "Error fetching default station",
                error: error.message,
            });
        }
    } else if (req.method === "POST") {
        try {
            const stationService = new StationService(req.db);
            const userId = req.user?.id;
            const { stationId } = req.body;

            if (!userId) {
                return res.status(401).json({ message: "User not authenticated" });
            }

            if (!stationId) {
                return res.status(400).json({ message: "Station ID is required" });
            }

            // Validate user has access to this station
            const hasAccess = await stationService.validateUserStationAccess(Number(userId), stationId);
            if (!hasAccess) {
                return res.status(403).json({
                    message: "User does not have access to this station"
                });
            }

            await stationService.setUserDefaultStation(Number(userId), stationId);

            // Invalidate cache for this user
            const cacheKey = `default-station-${userId}`;
            defaultStationCache.delete(cacheKey);

            res.status(200).json({
                message: "Default station updated successfully"
            });
        } catch (error: any) {
            console.error("Error setting user default station:", error);
            res.status(500).json({
                message: "Error setting default station",
                error: error.message,
            });
        }
    } else {
        res.setHeader("Allow", ["GET", "POST"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

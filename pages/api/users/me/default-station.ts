import permissions from "@backend/config/permissions";
import { StationService } from "@backend/service/StationService";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { NextApiRequest, NextApiResponse } from "next";
import { cache } from "@backend/utils/cache";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        return authMiddleware(async (req: NextApiRequest, res: NextApiResponse) => {
            try {
                const userId = req.user?.id;

                if (!userId) {
                    return res.status(401).json({ message: "User not authenticated" });
                }

                // Check cache first (using shared cache utility)
                const cacheKey = `api_default_station_${userId}`;
                const cached = cache.get<any>(cacheKey);

                if (cached !== null) {
                    return res.status(200).json(cached);
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

                // Cache the response (using shared cache utility)
                cache.set(cacheKey, response);

                res.status(200).json(response);
            } catch (error: any) {
                console.error("Error fetching user default station:", error);

                // Return a cached response if available, even if expired, to prevent complete failure
                const userId = req.user?.id;
                if (userId) {
                    const cacheKey = `api_default_station_${userId}`;
                    const cached = cache.get<any>(cacheKey);
                    if (cached !== null) {
                        return res.status(200).json(cached);
                    }
                }

                // If timeout or other error, return a safe default response
                res.status(200).json({
                    message: "No default station found for user",
                    hasDefaultStation: false
                });
            }
        })(req, res);
    } else if (req.method === "POST") {
        return authMiddleware(async (req: NextApiRequest, res: NextApiResponse) => {
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

                // Invalidate cache for this user (using shared cache utility)
                cache.invalidate(`api_default_station_${userId}`);
                cache.invalidate(`user_default_station_${userId}`);

                res.status(200).json({
                    message: "Default station updated successfully"
                });
            } catch (error: any) {
                console.error("Error setting user default station:", error);
                res.status(500).json({ message: "Some error occurred. Please try again." });
            }
        })(req, res);
    } else {
        res.setHeader("Allow", ["GET", "POST"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default withMiddleware(dbMiddleware)(handler);

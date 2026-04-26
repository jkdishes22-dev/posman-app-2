import permissions from "@backend/config/permissions";
import { StationService } from "@backend/service/StationService";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { NextApiRequest, NextApiResponse } from "next";
import { cache } from "@backend/utils/cache";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        try {
            const userId = req.user?.id;

            // If userId is undefined, auth middleware failed - this is a token issue
            // The auth middleware should have caught this, but if we get here, return 401
            if (!userId) {
                return res.status(401).json({ message: "Invalid token" });
            }

            // Check cache first (using shared cache utility)
            const cacheKey = `api_user_stations_${userId}`;
            const cached = cache.get<any>(cacheKey);

            if (cached !== null) {
                return res.status(200).json(cached);
            }

            const stationService = new StationService(req.db);
            const stations = await stationService.getUserStations(Number(userId));

            // Always return 200 with stations array (empty if user has no stations)
            // This is not a permission issue - some users (e.g., admin) might not have stations
            const response = {
                message: "User stations retrieved successfully",
                stations: stations || []
            };

            // Cache the response (using shared cache utility)
            cache.set(cacheKey, response);

            res.status(200).json(response);
        } catch (error: any) {
            console.error("Error fetching user stations:", error);
            res.status(500).json({ message: "Some error occurred. Please try again." });
        }
    } else {
        res.setHeader("Allow", ["GET"]);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

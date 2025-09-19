import permissions from "@backend/config/managed-roles";
import { StationService } from "@backend/service/StationService";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        try {
            const stationService = new StationService(req.db);
            const userId = req.user?.id;
            const { stationId } = req.query;

            console.log("Station access validation request:", { userId, stationId, userRoles: req.user?.roles });

            if (!userId) {
                console.log("Station access validation failed: No user ID");
                return res.status(401).json({ message: "User not authenticated" });
            }

            if (!stationId) {
                console.log("Station access validation failed: No station ID");
                return res.status(400).json({ message: "Station ID is required" });
            }

            const hasAccess = await stationService.validateUserStationAccess(Number(userId), Number(stationId));
            console.log("Station access validation result:", { userId, stationId, hasAccess });

            res.status(200).json({
                message: "User station access validated",
                hasAccess,
                userId,
                stationId: Number(stationId)
            });
        } catch (error: any) {
            console.error("Error validating user station access:", error);
            res.status(500).json({
                message: "Error validating station access",
                error: error.message,
            });
        }
    } else {
        res.setHeader("Allow", ["GET"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

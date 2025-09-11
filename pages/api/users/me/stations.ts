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

            if (!userId) {
                return res.status(401).json({ message: "User not authenticated" });
            }

            const stations = await stationService.getUserStations(Number(userId));

            res.status(200).json({
                message: "User stations retrieved successfully",
                stations
            });
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

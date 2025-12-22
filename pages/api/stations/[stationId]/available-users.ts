import { NextApiRequest, NextApiResponse } from "next";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { StationService } from "@backend/service/StationService";
import permissions from "@backend/config/permissions";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const { stationId } = req.query;

    if (!stationId || isNaN(Number(stationId))) {
        return res.status(400).json({ message: "Invalid station ID" });
    }

    const stationService = new StationService(req.db);

    try {
        switch (req.method) {
            case "GET":
                // Get available users (not yet linked to this station)
                await authMiddleware(
                    authorize([permissions.CAN_VIEW_STATION])(async (req, res) => {
                        const availableUsers = await stationService.getAvailableUsers(Number(stationId));
                        res.status(200).json({
                            message: "Available users fetched successfully",
                            users: availableUsers
                        });
                    })
                )(req, res);
                break;

            default:
                res.setHeader("Allow", ["GET"]);
                res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error: any) {
        console.error("Available users fetch error:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

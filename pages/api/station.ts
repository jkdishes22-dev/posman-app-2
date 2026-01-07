import { NextApiRequest, NextApiResponse } from "next";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { StationService } from "@backend/service/StationService";
import permissions from "@backend/config/permissions";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        await authMiddleware(
            authorize([permissions.CAN_VIEW_STATION])(async (req, res) => {
                const stationService = new StationService(req.db);
                const { status } = req.query;

                let stations;
                if (status === "enabled") {
                    stations = await stationService.getEnabledStations();
                } else {
                    stations = await stationService.getAllStations();
                }

                res.status(200).json(stations);
            })
        )(req, res);
    } catch (error: any) {
        console.error("Station API error:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

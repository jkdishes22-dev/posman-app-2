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
            case "POST":
                // Set a pricelist as default for a station
                await authMiddleware(
                    authorize([permissions.CAN_EDIT_STATION_PRICELIST])(async (req, res) => {
                        const { pricelistId } = req.body;

                        if (!pricelistId || isNaN(Number(pricelistId))) {
                            return res.status(400).json({ message: "Invalid pricelist ID" });
                        }

                        await stationService.setDefaultPricelist(Number(stationId), Number(pricelistId));
                        res.status(200).json({
                            message: "Default pricelist set successfully"
                        });
                    })
                )(req, res);
                break;

            case "DELETE":
                // Remove default pricelist for a station
                await authMiddleware(
                    authorize([permissions.CAN_EDIT_STATION_PRICELIST])(async (req, res) => {
                        await stationService.removeDefaultPricelist(Number(stationId));
                        res.status(200).json({
                            message: "Default pricelist removed successfully"
                        });
                    })
                )(req, res);
                break;

            default:
                res.setHeader("Allow", ["POST", "DELETE"]);
                res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error: any) {
        console.error("Default pricelist management error:", error);
        res.status(500).json({ message: "Some error occurred. Please try again." });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);
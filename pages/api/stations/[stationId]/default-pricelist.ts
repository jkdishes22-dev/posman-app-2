import permissions from "@backend/config/managed-roles";
import { StationService } from "@backend/service/StationService";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const { stationId } = req.query;

    if (req.method === "GET") {
        try {
            const stationService = new StationService(req.db);
            const defaultPricelist = await stationService.getStationDefaultPricelist(Number(stationId));

            if (!defaultPricelist) {
                return res.status(404).json({
                    message: "No default pricelist found for this station",
                    hasDefaultPricelist: false
                });
            }

            res.status(200).json({
                message: "Default pricelist retrieved successfully",
                hasDefaultPricelist: true,
                pricelist: defaultPricelist
            });
        } catch (error: any) {
            console.error("Error fetching station default pricelist:", error);
            res.status(500).json({
                message: "Error fetching default pricelist",
                error: error.message,
            });
        }
    } else if (req.method === "POST") {
        try {
            const stationService = new StationService(req.db);
            const { pricelistId } = req.body;

            if (!pricelistId) {
                return res.status(400).json({ message: "Pricelist ID is required" });
            }

            await stationService.setStationDefaultPricelist(Number(stationId), pricelistId);

            res.status(200).json({
                message: "Default pricelist updated successfully"
            });
        } catch (error: any) {
            console.error("Error setting station default pricelist:", error);
            res.status(500).json({
                message: "Error setting default pricelist",
                error: error.message,
            });
        }
    } else if (req.method === "PUT") {
        try {
            const stationService = new StationService(req.db);
            const { name } = req.body;

            const defaultPricelist = await stationService.createDefaultPricelistForStation(
                Number(stationId),
                name
            );

            res.status(201).json({
                message: "Default pricelist created successfully",
                pricelist: defaultPricelist
            });
        } catch (error: any) {
            console.error("Error creating station default pricelist:", error);
            res.status(500).json({
                message: "Error creating default pricelist",
                error: error.message,
            });
        }
    } else {
        res.setHeader("Allow", ["GET", "POST", "PUT"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

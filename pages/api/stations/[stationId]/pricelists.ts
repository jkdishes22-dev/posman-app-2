import { NextApiRequest, NextApiResponse } from "next";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { StationService } from "@backend/service/StationService";
import { PricelistService } from "@backend/service/PricelistService";
import permissions from "@backend/config/managed-roles";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { stationId } = req.query;

  if (!stationId || isNaN(Number(stationId))) {
    return res.status(400).json({ message: "Invalid station ID" });
  }

  const stationService = new StationService(req.db);
  const pricelistService = new PricelistService(req.db);

  try {
    switch (req.method) {
      case "GET":
        // Get all pricelists for a station
        await authMiddleware(
          authorize([permissions.CAN_VIEW_PRICELISTS])(async (req, res) => {
            const pricelists = await pricelistService.getPricelistsByStation(Number(stationId));
            res.status(200).json({
              message: "Pricelists fetched successfully",
              pricelists
            });
          })
        )(req, res);
        break;

      case "POST":
        // Link a pricelist to a station
        await authMiddleware(
          authorize([permissions.CAN_MANAGE_PRICELISTS])(async (req, res) => {
            const { pricelistId } = req.body;

            if (!pricelistId || isNaN(Number(pricelistId))) {
              return res.status(400).json({ message: "Invalid pricelist ID" });
            }

            await stationService.linkPricelistToStation(Number(stationId), Number(pricelistId));
            res.status(200).json({
              message: "Pricelist linked to station successfully"
            });
          })
        )(req, res);
        break;

      case "DELETE":
        // Unlink a pricelist from a station
        await authMiddleware(
          authorize([permissions.CAN_MANAGE_PRICELISTS])(async (req, res) => {
            const { pricelistId } = req.query;

            if (!pricelistId || isNaN(Number(pricelistId))) {
              return res.status(400).json({ message: "Invalid pricelist ID" });
            }

            await stationService.unlinkPricelistFromStation(Number(stationId), Number(pricelistId));
            res.status(200).json({
              message: "Pricelist unlinked from station successfully"
            });
          })
        )(req, res);
        break;

      default:
        res.setHeader("Allow", ["GET", "POST", "DELETE"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    console.error("Station pricelist management error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);
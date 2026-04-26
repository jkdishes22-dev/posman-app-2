import { NextApiRequest, NextApiResponse } from "next";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { StationService } from "@backend/service/StationService";
import { PricelistService } from "@backend/service/PricelistService";
import permissions from "@backend/config/permissions";
import { cache } from "@backend/utils/cache";

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
        await authorize([permissions.CAN_VIEW_PRICELIST])(async (req, res) => {
          // Check cache first (using shared cache utility)
          const cacheKey = `api_station_pricelists_${stationId}`;
          const cached = cache.get<any>(cacheKey);
          if (cached !== null) {
            // Set cache headers for browser caching (longer TTL for better performance)
            res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
            res.setHeader("ETag", `"station-pricelists-${stationId}"`);
            return res.status(200).json(cached);
          }

          const pricelistService = new PricelistService(req.db);
          const stationService = new StationService(req.db);

          // Fetch pricelists and station name in parallel
          const [pricelists, station] = await Promise.all([
            pricelistService.getPricelistsByStation(Number(stationId)),
            stationService.getStationById(Number(stationId))
          ]);

          // Transform the data to match the expected format
          const transformedPricelists = pricelists.map(pricelist => ({
            id: pricelist.id,
            name: pricelist.name,
            status: pricelist.status,
            is_default: pricelist.is_default,
            description: pricelist.description || null,
            station: {
              id: stationId,
              name: station?.name || `Station ${stationId}`
            }
          }));

          const response = {
            message: "Pricelists fetched successfully",
            pricelists: transformedPricelists
          };

          // Cache the result (using shared cache utility)
          cache.set(cacheKey, response);

          // Set cache headers (longer TTL for better performance)
          res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
          res.setHeader("ETag", `"station-pricelists-${stationId}"`);

          res.status(200).json(response);
        })(req, res);
        break;

      case "POST":
        // Link a pricelist to a station
        await authorize([permissions.CAN_EDIT_STATION_PRICELIST])(async (req, res) => {
          const { pricelistId } = req.body;

          if (!pricelistId || isNaN(Number(pricelistId))) {
            return res.status(400).json({ message: "Invalid pricelist ID" });
          }

          await stationService.linkPricelistToStation(Number(stationId), Number(pricelistId));

          // Invalidate cache after linking pricelist
          cache.invalidate(`api_station_pricelists_${stationId}`);
          cache.invalidate(`station_pricelists_${stationId}`);
          cache.invalidate(`station_${stationId}`);

          res.status(200).json({
            message: "Pricelist linked to station successfully"
          });
        })(req, res);
        break;

      case "DELETE":
        // Unlink a pricelist from a station
        await authorize([permissions.CAN_EDIT_STATION_PRICELIST])(async (req, res) => {
          const { pricelistId } = req.query;

          if (!pricelistId || isNaN(Number(pricelistId))) {
            return res.status(400).json({ message: "Invalid pricelist ID" });
          }

          await stationService.unlinkPricelistFromStation(Number(stationId), Number(pricelistId));

          // Invalidate cache after unlinking pricelist
          cache.invalidate(`api_station_pricelists_${stationId}`);
          cache.invalidate(`station_pricelists_${stationId}`);
          cache.invalidate(`station_${stationId}`);

          res.status(200).json({
            message: "Pricelist unlinked from station successfully"
          });
        })(req, res);
        break;

      default:
        res.setHeader("Allow", ["GET", "POST", "DELETE"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    console.error("Station pricelist management error:", error);
    res.status(500).json({ message: "Some error occurred. Please try again." });
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);
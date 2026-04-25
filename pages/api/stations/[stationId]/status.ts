import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { StationService } from "@backend/service/StationService";
import logger from "@backend/utils/logger";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "PATCH") {
    try {
      const { stationId } = req.query;
      const { action } = req.body;

      if (!stationId || !action) {
        return res.status(400).json({ message: "Station ID and action are required" });
      }

      if (!["activate", "deactivate"].includes(action)) {
        return res.status(400).json({ message: "Action must be 'activate' or 'deactivate'" });
      }

      const stationService = new StationService(req.db);
      const station = await stationService.getStationById(Number(stationId));

      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }

      const newStatus = action === "activate" ? "active" : "inactive";
      await stationService.updateStationStatus(Number(stationId), newStatus);

      logger.info({
        stationId,
        action,
        newStatus,
        userId: req.user?.id
      }, "Station status updated");

      res.status(200).json({
        message: `Station ${action}d successfully`,
        status: newStatus
      });
    } catch (error: any) {
      logger.error({ error: error.message, stationId: req.query.stationId }, "Failed to update station status");
      res.status(500).json({ message: "Some error occurred. Please try again." });
    }
  } else {
    res.setHeader("Allow", ["PATCH"]);
    res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

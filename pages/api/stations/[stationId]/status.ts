import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { StationService } from "@backend/service/StationService";
import logger from "@backend/utils/logger";
import permissions from "@backend/config/permissions";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "PATCH") {
    return authorize([permissions.CAN_EDIT_STATION])(async (request, response) => {
    try {
      const { stationId } = request.query;
      const { action } = request.body;

      if (!stationId || !action) {
        return response.status(400).json({ message: "Station ID and action are required" });
      }

      if (!["activate", "deactivate"].includes(action)) {
        return response.status(400).json({ message: "Action must be 'activate' or 'deactivate'" });
      }

      const stationService = new StationService(request.db);
      const station = await stationService.getStationById(Number(stationId));

      if (!station) {
        return response.status(404).json({ message: "Station not found" });
      }

      const newStatus = action === "activate" ? "active" : "inactive";
      await stationService.updateStationStatus(Number(stationId), newStatus);

      logger.info({
        stationId,
        action,
        newStatus,
        userId: request.user?.id
      }, "Station status updated");

      response.status(200).json({
        message: `Station ${action}d successfully`,
        status: newStatus
      });
    } catch (error: any) {
      logger.error({ error: error.message, stationId: request.query.stationId }, "Failed to update station status");
      response.status(500).json({ message: "Some error occurred. Please try again." });
    }
    })(req, res);
  } else {
    res.setHeader("Allow", ["PATCH"]);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

import permissions from "@backend/config/permissions";
import {
  deleteStationHandler,
  updateStationHandler,
} from "@backend/controllers/StationController";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { stationId } = req.query;

  if (!stationId || isNaN(Number(stationId))) {
    return res.status(400).json({ error: "Invalid station ID" });
  }

  if (req.method === "DELETE") {
    return authorize([permissions.CAN_DELETE_STATION])(deleteStationHandler)(req, res);
  }
  if (req.method === "PATCH") {
    return authorize([permissions.CAN_EDIT_STATION])(updateStationHandler)(req, res);
  }

  res.setHeader("Allow", ["DELETE", "PATCH"]);
  res.status(405).json({ error: `Method ${req.method} Not Allowed` });
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

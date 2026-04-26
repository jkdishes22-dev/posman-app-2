import permissions from "@backend/config/permissions";
import {
  addStationHandler,
  fetchStationsHandler,
} from "@backend/controllers/StationController";
import { authorize } from "@backend/middleware/auth";
import { authMiddleware } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    return authorize([permissions.CAN_ADD_STATION])(addStationHandler)(req, res);
  }
  if (req.method === "GET") {
    return authorize([permissions.CAN_VIEW_STATION])(fetchStationsHandler)(req, res);
  }
  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).json({ message: `Method ${req.method} Not Allowed` });
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

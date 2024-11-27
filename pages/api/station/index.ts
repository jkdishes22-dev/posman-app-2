import permissions from "@backend/config/managed-roles";
import { addStationHandler, fetchStationsHandler } from "@backend/controllers/StationController";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { ensureMetadata } from "@backend/utils/metadata-hack";
import { NextApiRequest, NextApiResponse } from "next"

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
   await ensureMetadata("Station");

   if (req.method === "POST") {
      await authMiddleware(authorize([permissions.CAN_ADD_STATION])(addStationHandler))(req, res)
   }
   if (req.method === "GET") {
      await authMiddleware(authorize([permissions.CAN_VIEW_STATION])(fetchStationsHandler))(req, res)
   }
};

export default handler;
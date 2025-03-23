import permissions from "@backend/config/managed-roles";
import { addStationHandler, fetchStationsHandler } from "@backend/controllers/StationController";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
// import { ensureMetadata } from "@backend/utils/metadata-hack";
import { NextApiRequest, NextApiResponse } from "next"

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
   // await ensureMetadata("Station");

   if (req.method === "POST") {
      await authMiddleware(
         authorize([permissions.CAN_ADD_STATION])
         (addStationHandler)
      )(req, res)
   }
   if (req.method === "GET") {
      await authMiddleware(authorize([permissions.CAN_VIEW_STATION])(fetchStationsHandler))(req, res)
   } else {
      res.setHeader("Allow", ["GET"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default withMiddleware(
   dbMiddleware,
   authMiddleware
 )(handler);
 
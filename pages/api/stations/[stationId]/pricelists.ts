import permissions from "@backend/config/managed-roles";
import { fetchStationPricelistHandler } from "@backend/controllers/StationController";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    await authMiddleware(
      authorize([permissions.CAN_VIEW_STATION_PRICELIST])(
        fetchStationPricelistHandler,
      ),
    )(req, res);
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

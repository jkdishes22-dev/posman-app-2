import permissions from "@backend/config/permissions";
import {
  addUserStation,
  disableUserStation,
  fetchUserStations,
  setDefaultUserStation,
} from "@backend/controllers/UserController";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    return authMiddleware(
      authorize([permissions.CAN_VIEW_USER_STATION])(fetchUserStations),
    )(req, res);
  }
  if (req.method === "POST") {
    return authMiddleware(
      authorize([permissions.CAN_ADD_USER_STATION])(addUserStation),
    )(req, res);
  }
  if (req.method === "PATCH") {
    const { action, userStationId, stationId } = req.body;
    const headerAction = req.headers["x-action"] as string;

    // Route to disableUserStation if:
    // 1. action is "deactivate" or "activate" in body, OR
    // 2. x-action header is "disable" or "deactivate" or "activate", OR
    // 3. body has userStationId but no stationId (disable/activate operations use userStationId)
    if (
      action === "deactivate" ||
      action === "activate" ||
      headerAction === "disable" ||
      headerAction === "deactivate" ||
      headerAction === "activate" ||
      (userStationId && !stationId)
    ) {
      return authMiddleware(
        authorize([permissions.CAN_EDIT_USER_STATION])(disableUserStation),
      )(req, res);
    } else if (stationId) {
      // Route to setDefaultUserStation if body has stationId
      return authMiddleware(
        authorize([permissions.CAN_EDIT_USER_STATION])(setDefaultUserStation),
      )(req, res);
    } else {
      // Invalid request - neither userStationId nor stationId provided
      res.status(400).json({ error: "Missing required field: either userStationId or stationId must be provided" });
      return;
    }
  }
  if (req.method === "DELETE") {
    return authMiddleware(
      authorize([permissions.CAN_DELETE_USER_STATION])(disableUserStation),
    )(req, res);
  }

  // Method not allowed
  res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

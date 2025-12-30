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
    const { action } = req.body;
    if (action === "deactivate" || action === "activate") {
      return authMiddleware(
        authorize([permissions.CAN_EDIT_USER_STATION])(disableUserStation),
      )(req, res);
    } else {
      return authMiddleware(
        authorize([permissions.CAN_EDIT_USER_STATION])(setDefaultUserStation),
      )(req, res);
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

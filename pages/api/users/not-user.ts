import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { UserService } from "@services/UserService";
import permissions from "@backend/config/permissions";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const reqDb = {
    db: req.body,
    ...req,
  };
  const userService = new UserService(reqDb.db);
  const users = await userService.getUserById(Number(req.query.id));
  res.status(200).json(users);
};

export default withMiddleware(dbMiddleware, authMiddleware)(
  authorize([permissions.CAN_VIEW_USER])(handler),
);

import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { UserService } from "@services/UserService";
import permissions from "@backend/config/managed-roles";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const userService = new UserService(req.db);
  const users = await userService.getUserById(Number(req.query.id));
  res.status(200).json(users);
};

export default authMiddleware(authorize([permissions.CAN_VIEW_USER])(handler));

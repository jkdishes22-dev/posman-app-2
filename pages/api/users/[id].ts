import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware } from "../../../src/backend/middleware/auth";
import { UserService } from "@services/user-service";

const userService = new UserService();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const users = await userService.getUserById(Number(req.query.id));
  res.status(200).json(users);
};

export default authMiddleware(handler);

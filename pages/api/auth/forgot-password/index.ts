import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import * as process from "process";
import { UserService } from "@backend/service/UserService";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";

const secret =
  process.env.JWT_SECRET ||
  "4d7f12a75ea5f8fb40e8540264d47610d8aef0af421fa8643e3fdb5eb92f69ba";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  const userService = new UserService(req.db);
  const securityData = await userService.getUserSecurityDataByUsername(username);

  if (!securityData || !securityData.security_question) {
    return res.status(404).json({ error: "User not found or no security question configured" });
  }

  const forgotToken = jwt.sign(
    { userId: securityData.id, purpose: "forgot-password" },
    secret,
    { expiresIn: "5m" },
  );

  return res.status(200).json({
    question: securityData.security_question,
    forgotToken,
  });
};

export default withMiddleware(dbMiddleware)(handler);

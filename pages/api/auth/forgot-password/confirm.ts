import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
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

  const { forgotToken, answer, recoveryCode, newPassword } = req.body;

  if (!forgotToken) {
    return res.status(400).json({ error: "Reset token is required" });
  }
  if (!answer && !recoveryCode) {
    return res.status(400).json({ error: "Answer or recovery code is required" });
  }
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: "New password must be at least 4 characters" });
  }

  let payload: any;
  try {
    payload = jwt.verify(forgotToken, secret);
  } catch {
    return res.status(401).json({ error: "Reset token is invalid or has expired" });
  }

  if (payload.purpose !== "forgot-password" || !payload.userId) {
    return res.status(401).json({ error: "Invalid reset token" });
  }

  const userService = new UserService(req.db);
  const rows: any[] = await req.db.query(
    "SELECT id, security_answer_hash, recovery_code_hash FROM user WHERE id = ? LIMIT 1",
    [payload.userId],
  ) ?? [];
  const user = rows[0];

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (answer) {
    if (!user.security_answer_hash) {
      return res.status(400).json({ error: "No security question configured" });
    }
    const match = await bcrypt.compare(answer.trim().toLowerCase(), user.security_answer_hash);
    if (!match) {
      return res.status(400).json({ error: "Incorrect answer" });
    }
  } else if (recoveryCode) {
    if (!user.recovery_code_hash) {
      return res.status(400).json({ error: "No recovery code configured" });
    }
    const match = await bcrypt.compare(recoveryCode, user.recovery_code_hash);
    if (!match) {
      return res.status(400).json({ error: "Invalid recovery code" });
    }
    // One-time use: clear the code after successful verification
    await userService.clearRecoveryCode(payload.userId);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await userService.resetPasswordByToken(payload.userId, hashedPassword);

  return res.status(200).json({ message: "Password has been reset successfully" });
};

export default withMiddleware(dbMiddleware)(handler);

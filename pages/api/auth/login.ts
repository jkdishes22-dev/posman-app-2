import { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
import * as process from "process";
import { UserService } from "@backend/service/UserService";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { v4 as uuidv4 } from "uuid";
import { User } from "@backend/entities/User";
import { getConnection } from "@backend/config/data-source";
import { formatSetupErrorResponse } from "@backend/config/startup-bootstrap";
import { cache } from "@backend/utils/cache";
config();
const secret =
  process.env.JWT_SECRET ||
  "4d7f12a75ea5f8fb40e8540264d47610d8aef0af421fa8643e3fdb5eb92f69ba";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const db = await getConnection();
    const userService = new UserService(db);

    // For login, we need password, so pass includePassword=true
    const user = await userService.getUserByUsername(username, true);
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    if (!user.password) {
      return res.status(500).json({ message: "User account configuration error" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Ensure roles are loaded
    if (!user.roles || !Array.isArray(user.roles)) {
      return res.status(500).json({ message: "User roles configuration error" });
    }

    const token = jwt.sign(
      {
        user: {
          firstname: user.firstName,
          lastname: user.lastName,
        },
        id: user.id,
        roles: user.roles.map((role) => role.name),
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || "15m" },
    );

    // Issue refresh token (long-lived)
    const refreshToken = uuidv4();
    // Use update query instead of loading entity for better performance
    await db.getRepository(User)
      .createQueryBuilder()
      .update(User)
      .set({ refreshToken })
      .where("id = :id", { id: user.id })
      .execute();

    // Invalidate cache after updating refresh token
    cache.invalidate(`user_username_${username}`);
    cache.invalidate(`user_${user.id}`);

    res.setHeader("Set-Cookie", `refreshToken=${refreshToken}; HttpOnly; Path=/; Max-Age=14400; Secure; SameSite=Strict`); // 4 hours

    res.status(200).json({ token, role: user.roles[0]?.name || "user" });
  } catch (error: any) {
    console.error("[login] Unhandled error:", error?.stack || error?.message || error);
    const setupError = formatSetupErrorResponse(error);
    if (setupError.body.code !== "SETUP_FAILED" || error?.name === "StartupBootstrapError") {
      return res.status(setupError.status).json(setupError.body);
    }

    res.status(500).json({ message: "Some error occurred. Please try again." });
  }
};

export default withMiddleware(dbMiddleware)(handler);

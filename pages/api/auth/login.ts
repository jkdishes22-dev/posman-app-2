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
config();
const secret =
  process.env.JWT_SECRET ||
  "4d7f12a75ea5f8fb40e8540264d47610d8aef0af421fa8643e3fdb5eb92f69ba";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { username, password } = req.body;

  const dbConn = {
    db: req.body,
    ...req,
  };

  try {
    const db = await getConnection();
    const userRepo = db.getRepository(User);
    const user = await userRepo.findOne({ where: { username }, relations: ["roles"] });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid username or password" });
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
      { expiresIn: "8h" },
    );

    // Issue refresh token (long-lived)
    const refreshToken = uuidv4();
    user.refreshToken = refreshToken;
    await userRepo.save(user);
    res.setHeader("Set-Cookie", `refreshToken=${refreshToken}; HttpOnly; Path=/; Max-Age=2592000; Secure; SameSite=Strict`); // 30 days

    res.status(200).json({ token, role: user.roles[0].name });
  } catch (error: any) {
    res.status(500).json({ message: "Internal Server Error" + error });
  }
};

export default withMiddleware(dbMiddleware)(handler);

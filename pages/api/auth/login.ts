import { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
import * as process from "process";
import { UserService } from "@backend/service/UserService";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
config();
const secret =
  process.env.JWT_SECRET ||
  "4d7f12a75ea5f8fb40e8540264d47610d8aef0af421fa8643e3fdb5eb92f69ba";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { username, password } = req.body;

  try {
    const userService = new UserService(req.db);
    const user = await userService.getUserByUsername(username);
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
      { expiresIn: "1h" },
    );

    res.status(200).json({ token, role: user.roles[0].name });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Internal Server Error" + error });
  }
};

export default withMiddleware(dbMiddleware)(handler);

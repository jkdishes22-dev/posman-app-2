import { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
import { UserService } from "@services/UserService";
import * as process from "process";
import { ensureMetadata } from "@backend/utils/metadata-hack";

config();
const secret = process.env.JWT_SECRET;
const userService = new UserService();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  await ensureMetadata("User");
  const { username, password } = req.body;

  try {
    const user = await userService.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    const token = jwt.sign(
      { id: user.id, roles: user.roles.map((role) => role.name) },
      secret,
      { expiresIn: "1h" },
    );

    res.status(200).json({ token, role: user.roles[0].name });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" + error });
  }
};

export default handler;

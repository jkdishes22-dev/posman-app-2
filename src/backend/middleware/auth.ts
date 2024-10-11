import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";

import { config } from "dotenv";
import * as process from "process";

config();

const secret = process.env.JWT_SECRET;

export const authMiddleware = (handler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    try {
      req.user = jwt.verify(token, secret);
      return handler(req, res);
    } catch (error) {
      return res.status(401).json({ message: "Invalid token" + error });
    }
  };
};

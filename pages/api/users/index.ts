import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware } from "../../../src/backend/middleware/auth";
import {
  createUserHandler,
  getUsersHandler,
} from "@controllers/user-controller";

import { config } from "dotenv";
import * as process from "process";

config();

const isAuthEnabled = process.env.AUTH_ENABLED || "false";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    console.log("isAuthEnabled:", isAuthEnabled);
    if (isAuthEnabled) {
      console.log("authenticated call");
      await authMiddleware(createUserHandler)(req, res);
    } else {
      console.log("first time create");
      await createUserHandler(req, res);
    }
  } else if (req.method === "GET") {
    await authMiddleware(getUsersHandler)(req, res);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default handler;

import { NextApiRequest, NextApiResponse } from "next";
import { loginUserHandler } from "@controllers/user-controller";
import { ensureMetadata } from "../../../src/backend/utils/metadata-hack";
import { User } from "@entities/User";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await ensureMetadata(User);
  if (req.method === "POST") {
    return loginUserHandler(req, res);
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

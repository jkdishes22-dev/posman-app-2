import { NextApiRequest, NextApiResponse } from "next";
import { getStartupSetupStatus } from "@backend/config/startup-bootstrap";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const shouldRetry = req.query.retry === "1";

  try {
    const status = await getStartupSetupStatus(shouldRetry);
    return res.status(200).json(status);
  } catch (error: any) {
    return res.status(500).json({
      state: "failed",
      code: "SETUP_FAILED",
      message: error?.message || "Unable to determine setup status.",
    });
  }
}

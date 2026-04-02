import { NextApiRequest, NextApiResponse } from "next";
import {
  runStartupInitialization,
  getStartupSetupStatus,
} from "@backend/config/startup-bootstrap";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const currentStatus = await getStartupSetupStatus(true);
    if (currentStatus.state === "db_server_unavailable") {
      return res.status(503).json({
        error: currentStatus.message,
        code: currentStatus.code,
        setupStatus: currentStatus,
      });
    }

    const status = await runStartupInitialization();
    if (status.state === "ready") {
      return res.status(200).json(status);
    }

    const failedStatusCode = status.state === "db_server_unavailable" ? 503 : 500;
    return res.status(failedStatusCode).json({
      error: status.message,
      code: status.code,
      setupStatus: status,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || "Failed to initialize database setup.",
      code: "SETUP_FAILED",
    });
  }
}

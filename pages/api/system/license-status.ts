import { NextApiRequest, NextApiResponse } from "next";
import { licenseService } from "@backend/licensing/LicenseService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const forceRefresh = req.query.refresh === "1";
    const status = await licenseService.getStatus(forceRefresh);
    const httpStatus =
      status.state === "ready"
        ? 200
        : status.state === "license_required" || status.state === "license_expired"
          ? 402
          : 403;

    return res.status(httpStatus).json(status);
  } catch (error: any) {
    return res.status(500).json({
      state: "license_invalid",
      code: "LICENSE_INVALID",
      message: error?.message || "Unable to resolve license status.",
    });
  }
}

import { NextApiRequest, NextApiResponse } from "next";
import { licenseService } from "@backend/licensing/LicenseService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const licenseCode = String(req.body?.licenseCode || "");
    const status = await licenseService.activateFromCode(licenseCode);
    return res.status(200).json(status);
  } catch (error: any) {
    const message = error?.message || "License activation failed.";
    const code = error?.code || "LICENSE_INVALID";
    const statusCode = code === "LICENSE_EXPIRED" ? 402 : 403;
    return res.status(statusCode).json({
      state: code === "LICENSE_EXPIRED" ? "license_expired" : "license_invalid",
      code,
      message,
    });
  }
}

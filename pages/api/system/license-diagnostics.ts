import { NextApiRequest, NextApiResponse } from "next";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { authMiddleware } from "@backend/middleware/auth";
import { licenseService } from "@backend/licensing/LicenseService";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const isAdmin = (req.user?.roles || []).some((role: any) => role?.name === "admin");
  if (!isAdmin) {
    return res.status(403).json({ message: "Admin access required." });
  }

  const forceRefresh = req.query.refresh === "1";
  const status = await licenseService.getStatus(forceRefresh);
  return res.status(200).json({
    state: status.state,
    code: status.code,
    message: status.message,
    planType: status.planType,
    expiresAt: status.expiresAt,
    checkedAt: new Date().toISOString(),
  });
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

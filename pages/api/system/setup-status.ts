import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const shouldRetry = req.query.retry === "1";

  try {
    // Dynamic import keeps module-load errors inside this try/catch so they return
    // JSON rather than Next.js's default HTML 500 error page.
    const { getStartupSetupStatus } = await import("@backend/config/startup-bootstrap");
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

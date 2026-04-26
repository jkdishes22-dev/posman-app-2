import { NextApiRequest, NextApiResponse } from "next";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { ReportService } from "@backend/service/ReportService";
import permissions from "@backend/config/permissions";

const getPnL = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const reportService = new ReportService(req.db);
    const { startDate, endDate, period } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required" });
    }

    const filters = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
      period: period as "day" | "week" | "month" | "year" | undefined,
    };

    const report = await reportService.getPnLReport(filters);
    res.status(200).json({ reports: report });
  } catch (error: any) {
    console.error("PnL Report API error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
  await authorize([permissions.CAN_VIEW_PNL_REPORT])(getPnL)(req, res);
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

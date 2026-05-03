import { NextApiRequest, NextApiResponse } from "next";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { ReportService } from "@backend/service/ReportService";
import { parseStartDateInAppTz, parseEndDateInAppTz } from "@backend/utils/dateRange";
import { parseReportPeriod } from "@backend/utils/reportPeriodBucket";
import permissions from "@backend/config/permissions";

const getItemsSoldCount = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const reportService = new ReportService(req.db);
    const { startDate, endDate, itemId, userId, period } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required" });
    }

    const parsedStart = parseStartDateInAppTz(startDate as string);
    const parsedEnd = parseEndDateInAppTz(endDate as string);
    if (!parsedStart || !parsedEnd) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
    }

    const filters = {
      startDate: parsedStart,
      endDate: parsedEnd,
      itemId: itemId ? parseInt(itemId as string, 10) : undefined,
      userId: userId ? parseInt(userId as string, 10) : undefined,
      period: parseReportPeriod(period),
    };

    const report = await reportService.getItemsSoldCountReport(filters);
    res.status(200).json({ reports: report });
  } catch (error: any) {
    console.error("Items Sold Count Report API error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
  await authorize([permissions.CAN_VIEW_ITEMS_SOLD_COUNT_REPORT])(getItemsSoldCount)(req, res);
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

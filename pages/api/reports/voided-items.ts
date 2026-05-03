import { NextApiRequest, NextApiResponse } from "next";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { ReportService } from "@backend/service/ReportService";
import { parseStartDateInAppTz, parseEndDateInAppTz } from "@backend/utils/dateRange";
import { parseReportPeriod } from "@backend/utils/reportPeriodBucket";
import permissions from "@backend/config/permissions";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    await authorize([permissions.CAN_VIEW_VOIDED_ITEMS_REPORT])(async (request, response) => {
        const reportService = new ReportService(request.db);
        const { startDate, endDate, itemId, userId, period } = request.query;

        if (!startDate || !endDate) {
          return response.status(400).json({
            message: "Start date and end date are required",
          });
        }

        const parsedStart = parseStartDateInAppTz(startDate as string);
        const parsedEnd = parseEndDateInAppTz(endDate as string);
        if (!parsedStart || !parsedEnd) {
          return response.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
        }

        const filters = {
          startDate: parsedStart,
          endDate: parsedEnd,
          itemId: itemId ? parseInt(itemId as string, 10) : undefined,
          userId: userId ? parseInt(userId as string, 10) : undefined,
          period: parseReportPeriod(period),
        };

        const report = await reportService.getVoidedItemsReport(filters);
        response.status(200).json({ reports: report });
      })(req, res);
  } catch (error: any) {
    console.error("Voided Items Report API error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);


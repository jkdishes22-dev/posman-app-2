import { NextApiRequest, NextApiResponse } from "next";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { ReportService } from "@backend/service/ReportService";
import permissions from "@backend/config/permissions";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    await authorize([permissions.CAN_VIEW_VOIDED_ITEMS_REPORT])(async (request, response) => {
        const reportService = new ReportService(request.db);
        const { startDate, endDate, itemId, userId } = request.query;

        if (!startDate || !endDate) {
          return response.status(400).json({
            message: "Start date and end date are required",
          });
        }

        const filters = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string),
          itemId: itemId ? parseInt(itemId as string, 10) : undefined,
          userId: userId ? parseInt(userId as string, 10) : undefined,
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


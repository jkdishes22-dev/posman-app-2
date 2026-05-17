import { NextApiRequest, NextApiResponse } from "next";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { ReportService } from "@backend/service/ReportService";
import permissions from "@backend/config/permissions";
import { PaymentType } from "@backend/entities/Payment";
import { parseStartDateInAppTz, parseEndDateInAppTz } from "@backend/utils/dateRange";

const getBillPaymentsReport = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const reportService = new ReportService(req.db);
    const { paymentType, reference, startDate, endDate, userId } = req.query;

    const parsedPaymentType =
      paymentType === PaymentType.CASH || paymentType === PaymentType.MPESA
        ? paymentType
        : undefined;

    const parsedStartDate = startDate ? parseStartDateInAppTz(startDate as string) : undefined;
    const parsedEndDate = endDate ? parseEndDateInAppTz(endDate as string) : undefined;

    if (startDate && !parsedStartDate) {
      return res.status(400).json({ message: "Invalid startDate format. Use YYYY-MM-DD." });
    }
    if (endDate && !parsedEndDate) {
      return res.status(400).json({ message: "Invalid endDate format. Use YYYY-MM-DD." });
    }

    const report = await reportService.getBillPaymentsReport({
      paymentType: parsedPaymentType,
      reference: typeof reference === "string" ? reference : undefined,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      userId: userId ? parseInt(userId as string, 10) : undefined,
    });
    res.status(200).json({ reports: report });
  } catch (error: any) {
    console.error("Bill Payments Report API error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  await authorize([permissions.CAN_VIEW_BILL_PAYMENT])(getBillPaymentsReport)(req, res);
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

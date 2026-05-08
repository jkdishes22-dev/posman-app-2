import { NextApiRequest, NextApiResponse } from "next";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { ReportService } from "@backend/service/ReportService";
import permissions from "@backend/config/permissions";
import { PaymentType } from "@backend/entities/Payment";
import { parseStartDateInAppTz } from "@backend/utils/dateRange";

const getBillPaymentsReport = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const reportService = new ReportService(req.db);
    const { paymentType, reference, paymentDate, userId } = req.query;

    const parsedPaymentType =
      paymentType === PaymentType.CASH || paymentType === PaymentType.MPESA
        ? paymentType
        : undefined;
    const parsedPaymentDate = paymentDate
      ? parseStartDateInAppTz(paymentDate as string)
      : undefined;

    if (paymentDate && !parsedPaymentDate) {
      return res.status(400).json({ message: "Invalid paymentDate format. Use YYYY-MM-DD." });
    }

    const report = await reportService.getBillPaymentsReport({
      paymentType: parsedPaymentType,
      reference: typeof reference === "string" ? reference : undefined,
      paymentDate: parsedPaymentDate || undefined,
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

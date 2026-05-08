import { NextApiRequest, NextApiResponse } from "next";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { ReportService } from "@backend/service/ReportService";
import permissions from "@backend/config/permissions";

const getBillPaymentUsers = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const reportService = new ReportService(req.db);
    const users = await reportService.getBillPaymentUserOptions();
    res.status(200).json({ users });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Bill Payments users API error:", error);
    res.status(500).json({ message: "Internal server error", error: message });
  }
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  await authorize([permissions.CAN_VIEW_BILL_PAYMENT])(getBillPaymentUsers)(req, res);
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

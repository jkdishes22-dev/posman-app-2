import { NextApiRequest, NextApiResponse } from "next";
import { BillFilter, BillService } from "@services/BillService";
import { DEFAULT_PAGE_SIZE } from "@backend/config/constants";

export const createBill = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  try {
    const newBill = await billService.createBill(req.body);
    res.status(201).json(newBill);
  } catch (error: any) {
    console.error("Error creating bill:", error);
    res.status(500).json({ error: `Error creating bill: ${error.message}` });
  }
};

export const fetchBills = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  const currentUserId = Number(req.user?.id);
  const { date, status, billId, billingUserId, page = 1, pageSize = DEFAULT_PAGE_SIZE } = req.query;

  let targetDate: Date | undefined = undefined;
  if (date) {
    // Parse YYYY-MM-DD format as UTC date to avoid timezone issues
    const dateStr = date as string;
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      targetDate = new Date(dateStr + "T00:00:00.000Z"); // Force UTC
    } else {
      targetDate = new Date(dateStr);
    }
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }
  }

  const billFilter: BillFilter = {
    targetDate,
    status,
    billId,
    billingUserId,
  };

  try {
    const { bills, total } = await billService.fetchBills(currentUserId, billFilter, Number(page), Number(pageSize));
    res.status(200).json({ bills, total });
  } catch (error: any) {
    console.error("Error fetching bills:", error);
    res.status(500).json({ error: `Error fetching bills: ${error.message}` });
  }
};

export const cancelBill = async (req: NextApiRequest, res: NextApiResponse) => {
  const { billId } = req.query;
  const billService = new BillService(req.db);

  try {
    const result = await billService.cancelBill(Number(billId));
    res.status(200).json({ message: "Bill cancelled successfully", result });
  } catch (error: any) {
    console.error("Error cancelling bill:", error);
    res.status(500).json({ error: `Error cancelling bill: ${error.message}` });
  }
};

export const voidBillItem = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const { billItemId } = req.query;
  const billService = new BillService(req.db);
  try {
    const result = await billService.voidBillItem(Number(billItemId));
    res.status(200).json({ message: "Bill item voided successfully", result });
  } catch (error: any) {
    console.error("Error voiding bill item:", error);
    res
      .status(500)
      .json({ error: `Error voiding bill item: ${error.message}` });
  }
};

export const fetchBillItems = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const { billId } = req.query;
  const billService = new BillService(req.db);

  try {
    const items = await billService.fetchBillItems(Number(billId));
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: "Error fetching bills", error });
  }
};

export const submitBill = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  try {
    const billPayment = req.body;
    const userId = req.user?.id;
    billPayment.userId = userId;

    const submittedBill = await billService.submitBill(billPayment);
    res.status(200).json(submittedBill);
  } catch (error) {
    res.status(500).json({ message: "Error submitting bill", error });
  }
};

export const closeBill = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  const { billId } = req.query;
  const userId = parseInt(req.user?.id as string);
  try {
    const closedBill = await billService.closeBill(Number(billId), userId);
    res.status(200).json(closedBill);
  } catch (error) {
    res.status(500).json({ message: "Error closing bill", error });
  }
};

export const bulkCloseBills = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  const { billIds } = req.body;
  const userId = parseInt(req.user?.id as string);
  if (!Array.isArray(billIds) || billIds.length === 0) {
    return res.status(400).json({ error: "billIds must be a non-empty array" });
  }
  try {
    const results = await billService.closeBillsBulk(billIds.map(Number), userId);
    res.status(200).json({ results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const bulkSubmitBills = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  const { billPayments } = req.body; // [{ billId, paymentMethod, ... }]
  if (!Array.isArray(billPayments) || billPayments.length === 0) {
    return res.status(400).json({ error: "billPayments must be a non-empty array" });
  }
  try {
    const results = await billService.submitBillsBulk(billPayments, parseInt(req.user?.id as string));
    res.status(200).json({ results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};


// ===== BILL VOIDING CONTROLLERS =====

export const requestVoidItem = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  const { billId, itemId } = req.query;
  const { reason } = req.body;

  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    return res.status(400).json({ error: "Valid reason is required" });
  }

  try {
    const result = await billService.requestVoidItem(
      Number(billId),
      Number(itemId),
      parseInt(req.user?.id as string),
      reason.trim()
    );

    res.status(200).json({
      message: "Void request created successfully",
      billItem: result
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const approveVoidRequest = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  const { billId, itemId } = req.query;
  const { approved, approvalNotes } = req.body;

  if (typeof approved !== "boolean") {
    return res.status(400).json({ error: "Approval status (approved) is required" });
  }

  try {
    const result = await billService.approveVoidRequest(
      Number(billId),
      Number(itemId),
      parseInt(req.user?.id as string),
      approved,
      approvalNotes?.trim()
    );

    res.status(200).json({
      message: `Void request ${approved ? "approved" : "rejected"} successfully`,
      billItem: result.billItem,
      bill: result.bill
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getPendingVoidRequests = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  const { billId } = req.query;

  try {
    const result = await billService.getPendingVoidRequests(Number(billId));
    res.status(200).json({ voidRequests: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getVoidHistory = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  const { billId } = req.query;

  try {
    const result = await billService.getVoidHistory(Number(billId));
    res.status(200).json({ voidHistory: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// ===== BILL REOPENING CONTROLLERS =====

export const reopenBill = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  const { billId } = req.query;
  const { reason } = req.body;

  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    return res.status(400).json({ error: "Valid reason is required" });
  }

  try {
    const result = await billService.reopenBill(
      Number(billId),
      parseInt(req.user?.id as string),
      reason.trim()
    );

    res.status(200).json({
      message: "Bill reopened successfully",
      bill: result
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const resubmitBill = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  const { billId } = req.query;
  const { notes } = req.body;

  try {
    const result = await billService.resubmitBill(
      Number(billId),
      parseInt(req.user?.id as string),
      notes?.trim()
    );

    res.status(200).json({
      message: "Bill resubmitted successfully",
      bill: result
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getReopenReasons = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const reasons = [
      { id: "mpesa_payment_unconfirmed", name: "M-Pesa Payment Unconfirmed", description: "M-Pesa payment could not be verified" },
      { id: "cash_payment_disputed", name: "Cash Payment Disputed", description: "Customer disputes cash payment amount" },
      { id: "payment_refund_required", name: "Payment Refund Required", description: "Refund needed for overpayment" },
      { id: "customer_complaint", name: "Customer Complaint", description: "Customer complaint about bill accuracy" },
      { id: "system_error", name: "System Error", description: "Technical error in bill processing" },
      { id: "other", name: "Other", description: "Other reason not listed above" }
    ];
    res.status(200).json({ reasons });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getReopenedBills = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const billService = new BillService(req.db);
    const bills = await billService.getReopenedBills();
    res.status(200).json({ bills });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

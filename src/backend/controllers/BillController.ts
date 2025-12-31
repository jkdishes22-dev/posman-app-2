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

export const getVoidRequests = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  const currentUserId = Number(req.user?.id);

  try {
    // Check user roles - supervisors see all void requests, sales users see only their own
    const userRoles = req.user?.roles?.map((role: any) => role.name || role) || [];
    const isSupervisor = userRoles.includes("supervisor") || userRoles.includes("admin");

    // Only pass userId for sales users - supervisors get all requests
    const userId = isSupervisor ? undefined : currentUserId;

    const voidRequests = await billService.getVoidRequests(userId);
    res.status(200).json({ voidRequests });
  } catch (error: any) {
    console.error("Error fetching void requests:", error);
    res.status(500).json({ error: `Error fetching void requests: ${error.message}` });
  }
};

export const getVoidRequestStats = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);

  try {
    const stats = await billService.getVoidRequestStats();
    res.status(200).json({ stats });
  } catch (error: any) {
    console.error("Error fetching void request stats:", error);
    res.status(500).json({ error: `Error fetching void request stats: ${error.message}` });
  }
};

export const getQuantityChangeRequests = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  const currentUserId = Number(req.user?.id);

  try {
    // Check user roles - supervisors see all quantity change requests, sales users see only their own
    const userRoles = req.user?.roles?.map((role: any) => role.name || role) || [];
    const isSupervisor = userRoles.includes("supervisor") || userRoles.includes("admin");

    // Only pass userId for sales users - supervisors get all requests
    const userId = isSupervisor ? undefined : currentUserId;

    const quantityChangeRequests = await billService.getQuantityChangeRequests(userId);
    res.status(200).json({ quantityChangeRequests });
  } catch (error: any) {
    console.error("Error fetching quantity change requests:", error);
    res.status(500).json({ error: `Error fetching quantity change requests: ${error.message}` });
  }
};

export const getQuantityChangeRequestStats = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);

  try {
    const stats = await billService.getQuantityChangeRequestStats();
    res.status(200).json({ stats });
  } catch (error: any) {
    console.error("Error fetching quantity change request stats:", error);
    res.status(500).json({ error: `Error fetching quantity change request stats: ${error.message}` });
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
  } catch (error: any) {
    console.error("Error submitting bill:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      billPayment: req.body
    });
    res.status(500).json({
      message: "Error submitting bill",
      error: error?.message || "Unknown error occurred",
      details: process.env.NODE_ENV === "development" ? {
        stack: error?.stack,
        name: error?.name
      } : undefined
    });
  }
};

export const closeBill = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  const { billId } = req.query;
  try {
    const closedBill = await billService.closeBill(Number(billId));
    res.status(200).json(closedBill);
  } catch (error: any) {
    console.error("Error closing bill:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      billId: req.query.billId
    });
    res.status(500).json({
      message: "Error closing bill",
      error: error?.message || "Unknown error occurred",
      details: process.env.NODE_ENV === "development" ? {
        stack: error?.stack,
        name: error?.name
      } : undefined
    });
  }
};

export const bulkCloseBills = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  const { billIds } = req.body;
  if (!Array.isArray(billIds) || billIds.length === 0) {
    return res.status(400).json({ error: "billIds must be a non-empty array" });
  }
  try {
    const results = await billService.closeBillsBulk(billIds.map(Number));
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

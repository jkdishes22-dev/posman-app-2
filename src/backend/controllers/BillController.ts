import { NextApiRequest, NextApiResponse } from "next";
import { BillFilter, BillService } from "@services/BillService";
import { DEFAULT_PAGE_SIZE } from "@backend/config/constants";
import { handleApiError } from "@backend/utils/errorHandler";
import { parseStartDateInAppTz, parseEndDateInAppTz } from "@backend/utils/dateRange";

export const createBill = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  try {
    const newBill = await billService.createBill(req.body);
    res.status(201).json(newBill);
  } catch (error: any) {
    const isValidationError = error?.message && (
      error.message.includes("Insufficient inventory") ||
      error.message.includes("not found") ||
      error.message.includes("Invalid")
    );
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "creating",
      resource: "bill"
    });
    res.status(isValidationError ? 400 : 500).json({ error: userMessage, code: errorCode });
  }
};

export const fetchBills = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  const currentUserId = Number(req.user?.id);
  const { date, startDate, endDate, status, billId, billingUserId, page = 1, pageSize = DEFAULT_PAGE_SIZE } = req.query;

  // BillService.fetchBills already converts targetDate to start/end of day in
  // the app timezone, so we keep targetDate as the day's start. For range
  // filters we explicitly use start-of-day / end-of-day in the app timezone so
  // that "today" includes bills created later in the day.
  const billFilter: BillFilter = {
    targetDate: parseStartDateInAppTz(date as string),
    startDate: parseStartDateInAppTz(startDate as string),
    endDate: parseEndDateInAppTz(endDate as string),
    status,
    billId,
    billingUserId,
  };

  try {
    const { bills, total } = await billService.fetchBills(currentUserId, billFilter, Number(page), Number(pageSize));
    res.status(200).json({ bills, total });
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "bills"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
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
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "void requests"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const getVoidRequestStats = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);

  try {
    const stats = await billService.getVoidRequestStats();
    res.status(200).json({ stats });
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "void request statistics"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
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
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "quantity change requests"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const getQuantityChangeRequestStats = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);

  try {
    const stats = await billService.getQuantityChangeRequestStats();
    res.status(200).json({ stats });
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "quantity change request statistics"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const getChangeRequests = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  const currentUserId = Number(req.user?.id);

  try {
    // Check user roles - supervisors see all change requests, sales users see only their own
    const userRoles = req.user?.roles?.map((role: any) => role.name || role) || [];
    const isSupervisor = userRoles.includes("supervisor") || userRoles.includes("admin");

    // Only pass userId for sales users - supervisors get all requests
    const userId = isSupervisor ? undefined : currentUserId;

    // Get requestType from query params: "void", "quantity_change", or "all" (default)
    const requestType = (req.query.requestType as "void" | "quantity_change" | "all") || "all";

    // Validate requestType
    if (!["void", "quantity_change", "all"].includes(requestType)) {
      return res.status(400).json({ error: "Invalid requestType. Must be 'void', 'quantity_change', or 'all'" });
    }

    const changeRequests = await billService.getChangeRequests(userId, requestType);
    res.status(200).json({ changeRequests });
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "change requests"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const cancelBill = async (req: NextApiRequest, res: NextApiResponse) => {
  const { billId } = req.query;
  const billService = new BillService(req.db);

  try {
    const result = await billService.cancelBill(Number(billId));
    res.status(200).json({ message: "Bill cancelled successfully", result });
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "cancelling",
      resource: "bill"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
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
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "voiding",
      resource: "bill item"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
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
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "bill items"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
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
    const isValidationError = error?.message && (
      error.message.includes("Insufficient inventory") ||
      error.message.includes("not found") ||
      error.message.includes("only submit bills that you created")
    );
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "submitting",
      resource: "bill"
    });
    res.status(isValidationError ? 400 : 500).json({ error: userMessage, code: errorCode });
  }
};

export const closeBill = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  const { billId } = req.query;
  try {
    const closedBill = await billService.closeBill(Number(billId));
    res.status(200).json(closedBill);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "closing",
      resource: "bill"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
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
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "closing",
      resource: "bills"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
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
    const isValidationError = error?.message && (
      error.message.includes("Insufficient inventory") ||
      error.message.includes("not found")
    );
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "submitting",
      resource: "bills"
    });
    res.status(isValidationError ? 400 : 500).json({ error: userMessage, code: errorCode });
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
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "reopening",
      resource: "bill"
    });
    res.status(400).json({ error: userMessage, code: errorCode });
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
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "resubmitting",
      resource: "bill"
    });
    res.status(400).json({ error: userMessage, code: errorCode });
  }
};

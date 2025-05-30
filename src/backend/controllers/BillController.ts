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
    targetDate = new Date(date as string);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }
  }

  const billFilter: BillFilter = {
    targetDate,
    status,
    billId,
    billingUserId,
  }
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

    console.log(billPayment);

    const submittedBill = await billService.submitBill(billPayment);
    res.status(200).json(submittedBill);
  } catch (error) {
    res.status(500).json({ message: "Error submitting bill", error });
  }
};

export const closeBill = async (req: NextApiRequest, res: NextApiResponse) => {
  const billService = new BillService(req.db);
  const { billId } = req.query;
  try {
    const closedBill = await billService.closeBill(Number(billId));
    res.status(200).json(closedBill);
  } catch (error) {
    res.status(500).json({ message: "Error closing bill", error });
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

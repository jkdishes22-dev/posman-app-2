import { NextApiRequest, NextApiResponse } from "next";
import { BillService } from "@services/BillService";

const billService = new BillService();

// Create a new bill
export const createBill = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const newBill = await billService.createBill(req.body);
    res.status(201).json(newBill);
  } catch (error) {
    console.error("Error creating bill:", error);
    res.status(500).json({ error: `Error creating bill: ${error.message}` });
  }
};


export const fetchBills = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const userId = req.user?.id;
  const { date, status, billId } = req.query;

  const targetDate = date ? new Date(date as string) : new Date();
  if (isNaN(targetDate.getTime())) {
    return res.status(400).json({ error: "Invalid date format" });
  }

  try {
    const bills = await billService.fetchBills(userId, {targetDate, status, billId});
    res.status(200).json(bills);
  } catch (error) {
    console.error("Error fetching bills:", error);
    res.status(500).json({ error: `Error fetching bills: ${error.message}` });
  }
};


// Cancel a bill
export const cancelBill = async (req: NextApiRequest, res: NextApiResponse) => {
  const { billId } = req.query;

  try {
    const result = await billService.cancelBill(Number(billId));
    res.status(200).json({ message: "Bill cancelled successfully", result });
  } catch (error) {
    console.error("Error cancelling bill:", error);
    res.status(500).json({ error: `Error cancelling bill: ${error.message}` });
  }
};

// Void a bill item
export const voidBillItem = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const { billItemId } = req.query;

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
  try {
    const items = await billService.fetchBillItems(billId);
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: "Error fetching permissions", error });
  }
};

export const submitBill = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
     const billPayment  = req.body;
     console.log(billPayment);
     console.log(req.body);
     const submit = await billService.submitBill(billPayment)
  } catch (error) {
    res.status(500).json({ message: "Error fetching permissions", error });
  }
}

import { NextApiRequest, NextApiResponse } from "next";
import { BillService } from "@services/BillService";

const billService = new BillService();

export const createBill = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const newBill = await billService.createBill(req.body);
    res.status(201).json(newBill);
  } catch (error) {
    console.error("Error creating bill:", error);
    res.status(500).json({ error: "Error creating bill" + error });
  }
};

export const fetchBills = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const bills = await billService.fetchBills();
    res.status(200).json(bills);
  } catch (error) {
    console.error("Error fetching bills:", error);
    return [];
  }
};

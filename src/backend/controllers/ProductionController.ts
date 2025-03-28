import { NextApiRequest, NextApiResponse } from "next";
import { ProductionService } from "@backend/service/ProductionService";

export const createProductionItemHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const productionService = new ProductionService(req.db);
  try {
    const user_id = req.user.id;
    const newItem = await productionService.createProductionItem(
      req.body,
      user_id,
    );
    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error creating production item:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const fetchProdutionItemsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const productionService = new ProductionService(req.db);
  try {
    const items = await productionService.fetchProductionItems();
    res.status(200).json(items);
  } catch (error) {
    console.error("Error fetching production items:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

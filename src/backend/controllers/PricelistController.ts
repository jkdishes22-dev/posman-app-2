import { NextApiRequest, NextApiResponse } from "next";
import { PricelistService } from "@services/PricelistService";

export const createPricelistHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const pricelistService = new PricelistService(req.db);
  try {
    const newPricelist = req.body;
    const user_id = parseInt(req.user.id, 10);
    const pricelist = await pricelistService.createPricelist(
      newPricelist,
      user_id,
    );
    res.status(201).json(pricelist);
  } catch (error: any) {
    console.error("Error creating pricelist:", error);
    res.status(500).json({ error: "Error creating pricelist" + error });
  }
};

export const fetchPricelistsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const pricelistService = new PricelistService(req.db);
  try {
    const pricelists = await pricelistService.fetchPricelists();
    res.status(200).json(pricelists);
  } catch (error: any) {
    console.error("Error fetching pricelists:", error);
    res.status(500).json({ error: "Error fetching pricelists" });
  }
};

export const fetchPricelistItems = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const pricelistService = new PricelistService(req.db);
  try {
    const pricelistId = req.query.pricelistId as string;
    const pricelistItems =
      await pricelistService.fetchPricelistItems(pricelistId);
    res.status(200).json(pricelistItems);
  } catch (error: any) {
    console.error("Error fetching pricelist items:", error);
    return [];
  }
};

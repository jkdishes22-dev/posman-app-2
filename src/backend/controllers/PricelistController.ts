import { NextApiRequest, NextApiResponse } from "next";
import { PricelistService } from "@services/PricelistService";

const pricelistService = new PricelistService();

export const createPricelistHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    const newPricelist = req.body;
    const user_id = req.user.id;
    const pricelist = await pricelistService.createPricelist(newPricelist, user_id);
    res.status(201).json(pricelist);
  } catch (error) {
    console.error("Error creating pricelist:", error);
    res.status(500).json({ error: "Error creating pricelist" + error });
  }
};

export const fetchPricelistsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    const pricelists = await pricelistService.fetchPricelists();
    res.status(200).json(pricelists);
  } catch (error) {
    console.error("Error fetching pricelists:", error);
    return [];
  }
};

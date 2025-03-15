import { NextApiRequest, NextApiResponse } from "next";
import { PricelistService } from "@services/PricelistService";
import Container from "typedi";

const pricelistService = Container.get(PricelistService);

export const createPricelistHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    console.log("pricelist payload "+ JSON.stringify(req.body));
    const newPricelist = req.body;
    const user_id = req.user.id;
    const pricelist = await pricelistService.createPricelist(
      newPricelist,
      user_id,
    );
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

export const fetchPricelistItems = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    const pricelistId = req.query.pricelistId as string;
    const pricelistItems =
      await pricelistService.fetchPricelistItems(pricelistId);
    res.status(200).json(pricelistItems);
  } catch (error) {
    console.error("Error fetching pricelist items:", error);
    return [];
  }
};

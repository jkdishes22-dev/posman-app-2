import { NextApiRequest, NextApiResponse } from "next";
import { PricelistService } from "@services/PricelistService";
import { handleApiError } from "@backend/utils/errorHandler";

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
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "creating",
      resource: "pricelist"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
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
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "pricelists"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const deletePricelistHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const pricelistService = new PricelistService(req.db);
  try {
    const { pricelistId } = req.query;
    if (!pricelistId) {
      return res.status(400).json({ error: "Pricelist ID is required" });
    }
    await pricelistService.deletePricelist(Number(pricelistId));
    res.status(200).json({ message: "Pricelist deleted successfully" });
  } catch (error: any) {
    const statusCode = error.statusCode ?? 500;
    if (statusCode === 404) return res.status(404).json({ error: error.message });
    if (statusCode === 400) return res.status(400).json({ error: error.message });
    const { userMessage, errorCode } = handleApiError(error, { operation: "deleting", resource: "pricelist" });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const updatePricelistHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const pricelistService = new PricelistService(req.db);
  try {
    const { pricelistId } = req.query;
    if (!pricelistId) {
      return res.status(400).json({ error: "Pricelist ID is required" });
    }
    const { name, code, description } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: "Pricelist name is required" });
    }
    await pricelistService.updatePricelist(Number(pricelistId), { name: name.trim(), code: code || null, description: description || null });
    res.status(200).json({ message: "Pricelist updated successfully" });
  } catch (error: any) {
    const statusCode = error.statusCode ?? 500;
    if (statusCode === 404) return res.status(404).json({ error: error.message });
    const { userMessage, errorCode } = handleApiError(error, { operation: "updating", resource: "pricelist" });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const fetchPricelistItems = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const pricelistService = new PricelistService(req.db);
  try {
    const pricelistId = req.query.pricelistId as string;
    const search = req.query.q as string | undefined;
    const forceRefresh = req.query.t !== undefined;
    const pricelistItems = await pricelistService.fetchPricelistItems(pricelistId, search, forceRefresh);
    res.status(200).json(pricelistItems);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "pricelist items"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

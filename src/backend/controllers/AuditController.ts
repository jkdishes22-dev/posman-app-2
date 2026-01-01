import { NextApiRequest, NextApiResponse } from "next";
import { AuditService } from "@services/AuditService";
import { handleApiError } from "@backend/utils/errorHandler";

export const getPricelistItemAuditHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const auditService = new AuditService(req.db);
  try {
    const { pricelistItemId } = req.query;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

    if (!pricelistItemId || isNaN(Number(pricelistItemId))) {
      return res.status(400).json({ error: "Invalid pricelist item ID" });
    }

    const auditLogs = await auditService.getPricelistItemAuditLog(
      Number(pricelistItemId),
      limit
    );

    res.status(200).json(auditLogs);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "pricelist item audit log"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const getItemAuditHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const auditService = new AuditService(req.db);
  try {
    // Support both 'id' (from route parameter) and 'itemId' (for backward compatibility)
    const itemId = (req.query.id || req.query.itemId) as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

    if (!itemId || isNaN(Number(itemId))) {
      return res.status(400).json({ error: "Invalid item ID" });
    }

    const auditLogs = await auditService.getItemAuditLog(
      Number(itemId),
      limit
    );

    res.status(200).json(auditLogs);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "item audit log"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const getPricelistAuditHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const auditService = new AuditService(req.db);
  try {
    const { pricelistId } = req.query;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 500;

    if (!pricelistId || isNaN(Number(pricelistId))) {
      return res.status(400).json({ error: "Invalid pricelist ID" });
    }

    const auditLogs = await auditService.getPricelistAuditLog(
      Number(pricelistId),
      limit
    );

    res.status(200).json(auditLogs);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "pricelist audit log"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};


import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { PricelistService } from "@backend/service/PricelistService";
import { PriceListStatus } from "@backend/entities/Pricelist";
import logger from "@backend/utils/logger";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "PATCH") {
    try {
      const { pricelistId } = req.query;
      const { action } = req.body;

      if (!pricelistId || !action) {
        return res.status(400).json({ message: "Pricelist ID and action are required" });
      }

      if (!["activate", "deactivate"].includes(action)) {
        return res.status(400).json({ message: "Action must be 'activate' or 'deactivate'" });
      }

      const pricelistService = new PricelistService(req.db);
      const pricelist = await pricelistService.getPricelistById(Number(pricelistId));

      if (!pricelist) {
        return res.status(404).json({ message: "Pricelist not found" });
      }

      const newStatus = action === "activate" ? PriceListStatus.ACTIVE : PriceListStatus.INACTIVE;
      await pricelistService.updatePricelistStatus(Number(pricelistId), newStatus);

      logger.info({ 
        pricelistId, 
        action, 
        newStatus, 
        userId: req.user?.id 
      }, "Pricelist status updated");

      res.status(200).json({ 
        message: `Pricelist ${action}d successfully`,
        status: newStatus 
      });
    } catch (error: any) {
      logger.error({ error: error.message, pricelistId: req.query.pricelistId }, "Failed to update pricelist status");
      res.status(500).json({
        message: "Error updating pricelist status",
        error: error.message,
      });
    }
  } else {
    res.setHeader("Allow", ["PATCH"]);
    res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

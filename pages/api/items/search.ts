import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { ItemService } from "@backend/service/ItemService";
import logger from "@backend/utils/logger";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    try {
      const { q, limit = "10" } = req.query;

      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query 'q' is required" });
      }

      const itemService = new ItemService(req.db);
      const searchResults = await itemService.searchItemsByName(q, parseInt(limit as string));

      logger.info({
        query: q,
        limit: parseInt(limit as string),
        resultCount: searchResults.length,
        userId: req.user?.id
      }, 'Item search performed');

      res.status(200).json({
        items: searchResults,
        query: q,
        total: searchResults.length
      });
    } catch (error: any) {
      logger.error({ error: error.message, query: req.query.q }, 'Failed to search items');
      res.status(500).json({
        message: "Error searching items",
        error: error.message,
      });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

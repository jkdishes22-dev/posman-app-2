import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { ItemService } from "@backend/service/ItemService";
import { handleApiError } from "@backend/utils/errorHandler";
import logger from "@backend/utils/logger";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    try {
      const { q, limit = "10" } = req.query;
      const userId = req.user?.id;

      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query 'q' is required" });
      }

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const itemService = new ItemService(req.db);

      // Use user-specific search that respects station access control
      const searchResults = await itemService.searchItemsByNameForUser(
        q,
        parseInt(userId as string),
        parseInt(limit as string)
      );

      logger.info({
        query: q,
        limit: parseInt(limit as string),
        resultCount: searchResults.length,
        userId: userId
      }, "Item search performed for user");

      res.status(200).json({
        items: searchResults,
        query: q,
        total: searchResults.length
      });
    } catch (error: any) {
      logger.error({ error: error.message, query: req.query.q, userId: req.user?.id }, "Failed to search items");
      const { userMessage, errorCode } = handleApiError(error, {
        operation: "searching",
        resource: "items",
      });
      res.status(500).json({ error: userMessage, code: errorCode });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

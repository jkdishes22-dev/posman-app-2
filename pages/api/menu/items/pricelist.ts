import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { ItemService } from "@backend/service/ItemService";
import logger from "@backend/utils/logger";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        try {
            const itemService = new ItemService(req.db);
            const { pricelistId, categoryId } = req.query;
            const userId = req.user?.id;

            if (!pricelistId) {
                return res.status(400).json({ message: "Pricelist ID is required" });
            }

            if (!userId) {
                return res.status(401).json({ message: "User authentication required" });
            }

            // Validate user access to the pricelist
            const hasAccess = await itemService.validateUserPricelistAccess(Number(userId), Number(pricelistId));
            if (!hasAccess) {
                logger.warn({ userId, pricelistId }, 'User attempted to access unauthorized pricelist');
                return res.status(403).json({ 
                    message: "Access denied: You do not have permission to view items from this pricelist" 
                });
            }

            // Fetch items for the specific pricelist (now properly authorized)
            const items = await itemService.fetchItemsForPricelist(
                Number(pricelistId),
                categoryId ? Number(categoryId) : undefined
            );

            logger.info({
                pricelistId: Number(pricelistId),
                categoryId: categoryId ? Number(categoryId) : null,
                userId,
                itemCount: items.length
            }, 'Items fetched for pricelist');

            res.status(200).json({
                message: "Items retrieved successfully",
                items,
                pricelistId: Number(pricelistId),
                categoryId: categoryId ? Number(categoryId) : null,
                count: items.length
            });
        } catch (error: any) {
            logger.error({ error: error.message, pricelistId: req.query.pricelistId, userId: req.user?.id }, 'Failed to fetch pricelist items');
            res.status(500).json({
                message: "Error fetching items for pricelist",
                error: error.message,
            });
        }
    } else {
        res.setHeader("Allow", ["GET"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

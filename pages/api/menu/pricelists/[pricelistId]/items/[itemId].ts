import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import permissions from "@backend/config/permissions";
import { PricelistService } from "@backend/service/PricelistService";
import { getConnection } from "@backend/config/data-source";
import { cache } from "@backend/utils/cache";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const { pricelistId, itemId } = req.query;

    if (!pricelistId || isNaN(Number(pricelistId))) {
        return res.status(400).json({ message: "Invalid pricelist ID" });
    }

    if (!itemId || isNaN(Number(itemId))) {
        return res.status(400).json({ message: "Invalid item ID" });
    }

    if (req.method === "DELETE") {
        return authMiddleware(
            authorize([permissions.CAN_DELETE_ITEM])(async (req, res) => {
                try {
                    const connection = await getConnection();
                    const pricelistService = new PricelistService(connection);

                    // Remove item from pricelist by deleting the PricelistItem relationship
                    await pricelistService.removeItemFromPricelist(
                        Number(pricelistId),
                        Number(itemId)
                    );

                    // Invalidate cache
                    cache.invalidate(`pricelist_items_${pricelistId}`);
                    cache.invalidate("items");

                    res.status(200).json({
                        message: "Item removed from pricelist successfully"
                    });
                } catch (error: any) {
                    console.error("Error removing item from pricelist:", error);
                    res.status(500).json({
                        message: "Failed to remove item from pricelist",
                        error: error.message
                    });
                }
            })
        )(req, res);
    } else {
        res.setHeader("Allow", ["DELETE"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);


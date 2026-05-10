import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { Item } from "@backend/entities/Item";
import { ItemStatus } from "@backend/entities/Item";
import { getConnection } from "@backend/config/data-source";
import permissions from "@backend/config/permissions";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        return authorize([permissions.CAN_VIEW_ITEM])(async (request, response) => {
        try {
            const { q, limit } = req.query;
            const db = await getConnection();
            const itemRepository = db.getRepository(Item);

            const qTrimmed = q && typeof q === "string" ? q.trim() : "";
            const defaultLimit = qTrimmed.length > 0 ? 20 : 500;
            const parsedLimit = parseInt((limit as string) || String(defaultLimit), 10);
            const limitNum = Number.isFinite(parsedLimit)
                ? Math.min(Math.max(1, parsedLimit), 2000)
                : defaultLimit;

            // Build query for sellable items (isStock === false)
            const queryBuilder = itemRepository
                .createQueryBuilder("item")
                .leftJoinAndSelect("item.category", "category")
                .where("item.is_stock = :isStock", { isStock: false })
                .andWhere("item.is_group = :isGroup", { isGroup: false })
                .andWhere("item.status = :status", { status: ItemStatus.ACTIVE })
                .andWhere(
                    "EXISTS (SELECT 1 FROM pricelist_item pi_sub WHERE pi_sub.item_id = item.id)"
                );

            // Add search filter if query provided
            if (qTrimmed.length > 0) {
                queryBuilder.andWhere(
                    "(item.name LIKE :search OR item.code LIKE :search)",
                    { search: `%${qTrimmed}%` }
                );
            }

            queryBuilder
                .orderBy("item.name", "ASC")
                .limit(limitNum);

            const items = await queryBuilder.getMany();

            const formattedItems = items.map((item) => ({
                id: item.id,
                name: item.name,
                code: item.code,
                category: item.category?.name || "N/A",
                isStock: item.isStock,
                isGroup: item.isGroup,
            }));

            response.status(200).json({
                items: formattedItems,
                query: q || "",
                total: formattedItems.length,
            });
        } catch (error: any) {
            console.error("Error fetching sellable items:", error);
            response.status(500).json({
                message: "Error fetching sellable items",
                error: error.message,
            });
        }
        })(req, res);
    } else {
        res.setHeader("Allow", ["GET"]);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);


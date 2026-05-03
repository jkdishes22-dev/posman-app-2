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
            const { q, limit = "5000" } = req.query;
            const db = await getConnection();
            const itemRepository = db.getRepository(Item);

            const lim = Math.min(10000, Math.max(1, parseInt(String(limit), 10) || 5000));

            // Suppliable = stock/raw items purchased via PO (not menu groups; those are fulfilled via production).
            const queryBuilder = itemRepository
                .createQueryBuilder("item")
                .leftJoinAndSelect("item.category", "category")
                .where("item.is_stock = :isStock", { isStock: true })
                .andWhere("item.status = :status", { status: ItemStatus.ACTIVE })
                .andWhere("(item.isGroup = :notGroup OR item.isGroup IS NULL)", { notGroup: false });

            if (q && typeof q === "string" && q.trim().length > 0) {
                queryBuilder.andWhere(
                    "(item.name LIKE :search OR item.code LIKE :search)",
                    { search: `%${q.trim()}%` }
                );
            }

            queryBuilder.orderBy("item.name", "ASC").limit(lim);

            const items = await queryBuilder.getMany();

            const formattedItems = items.map((item) => ({
                id: item.id,
                name: item.name,
                code: item.code,
                category: item.category?.name || "N/A",
                isStock: item.isStock,
            }));

            response.status(200).json({
                items: formattedItems,
                query: q || "",
                total: formattedItems.length,
            });
        } catch (error: any) {
            console.error("Error fetching suppliable items:", error);
            response.status(500).json({
                message: "Error fetching suppliable items",
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


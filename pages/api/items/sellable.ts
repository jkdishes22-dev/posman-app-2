import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { Item } from "@backend/entities/Item";
import { ItemStatus } from "@backend/entities/Item";
import { getConnection } from "@backend/config/data-source";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        try {
            const { q, limit = "20" } = req.query;
            const db = await getConnection();
            const itemRepository = db.getRepository(Item);

            // Build query for sellable items (isStock === false)
            const queryBuilder = itemRepository
                .createQueryBuilder("item")
                .leftJoinAndSelect("item.category", "category")
                .where("item.is_stock = :isStock", { isStock: false })
                .andWhere("item.status = :status", { status: ItemStatus.ACTIVE });

            // Add search filter if query provided
            if (q && typeof q === "string" && q.trim().length > 0) {
                queryBuilder.andWhere(
                    "(item.name LIKE :search OR item.code LIKE :search)",
                    { search: `%${q.trim()}%` }
                );
            }

            queryBuilder
                .orderBy("item.name", "ASC")
                .limit(parseInt(limit as string, 10));

            const items = await queryBuilder.getMany();

            const formattedItems = items.map((item) => ({
                id: item.id,
                name: item.name,
                code: item.code,
                category: item.category?.name || "N/A",
                isStock: item.isStock,
            }));

            res.status(200).json({
                items: formattedItems,
                query: q || "",
                total: formattedItems.length,
            });
        } catch (error: any) {
            console.error("Error fetching sellable items:", error);
            res.status(500).json({
                message: "Error fetching sellable items",
                error: error.message,
            });
        }
    } else {
        res.setHeader("Allow", ["GET"]);
        res.status(405).json({ message: `Method ${req.method} not allowed` });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);


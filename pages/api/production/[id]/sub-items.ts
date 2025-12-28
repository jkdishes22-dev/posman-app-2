import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import permissions from "@backend/config/permissions";
import { ItemService } from "@backend/service/ItemService";
import { getConnection } from "@backend/config/data-source";
import { ItemGroup } from "@backend/entities/ItemGroup";
import { Item } from "@backend/entities/Item";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const { id } = req.query;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: "Invalid item ID" });
    }

    const connection = await getConnection();
    const itemService = new ItemService(connection);

    if (req.method === "GET") {
        try {
            // Validate that the item is a composite item (isGroup: true)
            const itemRepository = connection.getRepository(Item);
            const item = await itemRepository.findOne({ where: { id: Number(id) } });
            
            if (!item) {
                return res.status(404).json({ message: "Item not found" });
            }
            
            if (!item.isGroup) {
                return res.status(400).json({ 
                    message: "This item is not a composite item. Only composite items (isGroup: true) can have recipes." 
                });
            }
            
            // Get sub-items with portion sizes from item_group table
            const itemGroupRepository = connection.getRepository(ItemGroup);
            const subItems = await itemGroupRepository.find({
                where: { item: { id: Number(id) } },
                relations: ["subItem", "subItem.category"],
                order: { subItem: { name: "ASC" } }
            });

            // Format the response
            const formattedSubItems = subItems.map((itemGroup: any) => ({
                id: itemGroup.subItem.id,
                name: itemGroup.subItem.name,
                code: itemGroup.subItem.code,
                category: itemGroup.subItem.category?.name || "N/A",
                portionSize: itemGroup.portion_size,
                unit: "servings"
            }));

            // Format response to match frontend expectations: result.data?.[0]?.subItems
            res.status(200).json([{
                subItems: formattedSubItems || []
            }]);
        } catch (error: any) {
            console.error("Error fetching sub-items:", error);
            res.status(500).json({
                message: "Failed to fetch sub-items",
                error: error.message
            });
        }
    } else if (req.method === "POST") {
        return authMiddleware(
            authorize([permissions.CAN_ADD_ITEM])(async (req, res) => {
                try {
                    const { subItemId, portionSize } = req.body;

                    if (!subItemId || portionSize === undefined || portionSize === null) {
                        return res.status(400).json({
                            message: "subItemId and portionSize are required"
                        });
                    }

                    // Enforce that only composite items (isGroup: true) can have recipes
                    const itemRepository = connection.getRepository(Item);
                    const item = await itemRepository.findOne({ where: { id: Number(id) } });
                    const subItem = await itemRepository.findOne({ where: { id: Number(subItemId) } });

                    if (!item || !subItem) {
                        return res.status(404).json({
                            message: "Item or sub-item not found"
                        });
                    }
                    
                    // Validate that the item is a composite item
                    if (!item.isGroup) {
                        return res.status(400).json({
                            message: "This item is not a composite item. Only composite items (isGroup: true) can have recipes. Please mark the item as a composite item first."
                        });
                    }

                    // Check if relationship already exists
                    const itemGroupRepository = connection.getRepository(ItemGroup);
                    const existing = await itemGroupRepository.findOne({
                        where: {
                            item: { id: Number(id) },
                            subItem: { id: Number(subItemId) }
                        }
                    });

                    if (existing) {
                        return res.status(400).json({
                            message: "Sub-item already exists for this item"
                        });
                    }

                    // Create the ItemGroup relationship
                    const newItemGroup = itemGroupRepository.create({
                        item: item,
                        subItem: subItem,
                        portion_size: Number(portionSize)
                    });
                    await itemGroupRepository.save(newItemGroup);
                    res.status(200).json({ message: "Sub-item added successfully" });
                } catch (error: any) {
                    console.error("Error adding sub-item:", error);
                    res.status(500).json({
                        message: "Failed to add sub-item",
                        error: error.message
                    });
                }
            })
        )(req, res);
    } else {
        res.setHeader("Allow", ["GET", "POST"]);
        res.status(405).json({ message: `Method ${req.method} not allowed` });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);


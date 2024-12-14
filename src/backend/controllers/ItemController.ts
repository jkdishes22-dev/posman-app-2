import { NextApiRequest, NextApiResponse } from "next";
import { ItemService } from "@services/ItemService";

const itemService = new ItemService();

export const fetchItemsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    const { category, billing } = req.query;
    const user_id = req.user.id;
    const targetUsage = billing === 'true' ? true : false;

    const items = await itemService.fetchItems(category, user_id, targetUsage);
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch items", error });
  }
};

export const createItemHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    const { name, code, price, category, pricelistId, isGroup } = req.body;
    const user_id = req.user.id;

    const itemData = {
      name,
      code,
      category,
      isGroup,
    };
    const item = await itemService.createItem(
      itemData,
      { pricelistId, price },
      user_id,
    );
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to create item", error });
  }
};

export const updateItemHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    console.log("Updating Item:", req.body);
    const {
      id,
      name,
      code,
      price,
      category,
      pricelistItemId,
      isGroup,
      pricelistId,
    } = req.body;
    const user_id = req.user.id;

    const itemData = {
      id,
      name,
      code,
      category,
      isGroup,
    };

    const updatedItem = await itemService.updateItem(
      itemData,
      { pricelistItemId, price },
      user_id,
      pricelistId,
    );

    res.status(200).json(updatedItem);
  } catch (error) {
    console.log("Error updating item:", error);
    res.status(500).json({ message: "Failed to update item", error });
  }
};

export const fetchGroupedItemsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    const items = await itemService.fetchGroupedItems();
    res.status(200).json(items);
  } catch (error) {
    console.error("Error fetching group items:", error);
    res.status(500).json({ message: "Failed to fetch grouped items", error });
  }
};

export const createGroupItemHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const { itemId, subItemId } = req.body;
  try {
    const newGroupItem = await itemService.createGroupedItem(itemId, subItemId);
    res.status(201).json(newGroupItem);
  } catch (error) {
    res.status(500).json({ message: "Failed to create group item", error });
  }
};

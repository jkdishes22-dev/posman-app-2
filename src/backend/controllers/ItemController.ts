import { NextApiRequest, NextApiResponse } from "next";
import { ItemService } from "@services/ItemService";

export const filterItemsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const itemService = new ItemService(req.db);
  try {
    const { search, excludeGrouped } = req.query;
    if (!search) {
      return res.status(400).json({ message: "Search term is required" });
    }
    const criteria = {
      search,
      excludeGrouped: excludeGrouped === "true",
    };

    console.log("criteria" + JSON.stringify(criteria));
    const items = await itemService.filterItems(criteria);
    return res.status(200).json(items);
  } catch (error) {
    console.error("Error filtering items:", error);
    return res.status(500).json({ message: "Failed to filter items", error });
  }
};

export const fetchItemsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const itemService = new ItemService(req.db);
  try {
    const { category, billing } = req.query;
    const user_id = req.user.id;
    const targetUsage = billing === "true" ? true : false;

    const items = await itemService.fetchItems(
      parseInt(category),
      user_id,
      targetUsage,
    );
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch items", error });
  }
};

export const createItemHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const itemService = new ItemService(req.db);
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
  const itemService = new ItemService(req.db);
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
  const itemService = new ItemService(req.db);
  try {
    const { groupId } = req.query;

    const items = await itemService.fetchGroupedItems(groupId);
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
  const itemService = new ItemService(req.db);
  const { itemId, subItemId, portionSize } = req.body;
  const groupItemRequest = {
    itemId,
    subItemId,
    portionSize,
  };

  try {
    const newGroupItem = await itemService.createGroupedItem(groupItemRequest);
    res.status(201).json(newGroupItem);
  } catch (error) {
    res.status(500).json({ message: "Failed to create group item", error });
  }
};

export const fetchGroupItemsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const { groupId } = req.query;
  const itemService = new ItemService(req.db);
  try {
    const groupItems = await itemService.fetchGroupItems(groupId);
    res.status(201).json(groupItems);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch group items", error });
  }
};

export const removeItemFromGroupHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const itemService = new ItemService(req.db);
  try {
    const { groupId, itemId } = req.query;
    if (!groupId || !itemId) {
      return res
        .status(400)
        .json({ message: "Group ID and Item ID are required" });
    }
    itemService.removeItemFromGroup(groupId, itemId);
    res.status(200).json({ message: "Item removed successfully" });
  } catch (error) {
    console.error("Error removing item from group:", error);
    res.status(500).json({
      message: "Error removing item from group",
      error: error.message,
    });
  }
};

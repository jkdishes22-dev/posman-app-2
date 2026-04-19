import { NextApiRequest, NextApiResponse } from "next";
import { ItemService } from "@services/ItemService";
import { handleApiError } from "@backend/utils/errorHandler";

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

    const items = await itemService.filterItems(criteria);
    return res.status(200).json(items);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "filtering",
      resource: "items"
    });
    return res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const fetchItemsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const itemService = new ItemService(req.db);
  try {
    const { category, billing } = req.query;
    const user_id = parseInt(req.user.id, 10);
    const targetUsage = billing === "true" ? true : false;

    const categoryValue = Array.isArray(category) ? category[0] : category;
    const items = await itemService.fetchItems(
      parseInt(categoryValue),
      user_id,
      targetUsage,
    );
    res.status(200).json(items);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "items"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const createItemHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const itemService = new ItemService(req.db);
  try {
    const { name, code, price, category, pricelistId, isGroup, isStock, allowNegativeInventory } = req.body;
    const user_id = parseInt(req.user.id, 10);

    const itemData = {
      name,
      code,
      category,
      isGroup,
      isStock: isStock || false, // Default to false if not provided
      allowNegativeInventory: allowNegativeInventory ?? false,
    };
    const item = await itemService.createItem(
      itemData,
      { pricelistId, price },
      user_id,
    );
    res.status(201).json(item);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "creating",
      resource: "item"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const updateItemHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const itemService = new ItemService(req.db);
  try {
    const {
      id,
      name,
      code,
      price,
      category,
      pricelistItemId,
      isGroup,
      isStock,
      allowNegativeInventory,
      pricelistId,
    } = req.body;
    const user_id = parseInt(req.user.id, 10);

    const itemData = {
      id,
      name,
      code,
      category,
      isGroup,
      isStock,
      allowNegativeInventory,
    };

    const updatedItem = await itemService.updateItem(
      itemData,
      { pricelistItemId, price },
      user_id,
      pricelistId,
    );

    res.status(200).json(updatedItem);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "updating",
      resource: "item"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const fetchGroupedItemsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const itemService = new ItemService(req.db);
  try {
    const { groupId, page, limit } = req.query;
    const groupIdValue = Array.isArray(groupId) ? groupId[0] : groupId;
    const pageValue = parseInt(Array.isArray(page) ? page[0] : page || "1");
    const limitValue = parseInt(Array.isArray(limit) ? limit[0] : limit || "10");

    const items = await itemService.fetchGroupedItems(
      groupIdValue ? parseInt(groupIdValue) : undefined,
      pageValue,
      limitValue
    );
    res.status(200).json(items);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "grouped items"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
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
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "creating",
      resource: "group item"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const fetchGroupItemsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const { groupId } = req.query;
  const itemService = new ItemService(req.db);
  try {
    const groupIdValue = Array.isArray(groupId) ? groupId[0] : groupId;
    const groupItems = await itemService.fetchGroupedItems(parseInt(groupIdValue));
    res.status(201).json(groupItems);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "group items"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
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
    const groupIdValue = Array.isArray(groupId) ? groupId[0] : groupId;
    const itemIdValue = Array.isArray(itemId) ? itemId[0] : itemId;

    itemService.removeItemFromGroup(parseInt(groupIdValue), parseInt(itemIdValue));
    res.status(200).json({ message: "Item removed successfully" });
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "removing",
      resource: "item from group"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const getSubItemsForPlatterHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const itemService = new ItemService(req.db);
  try {
    const { groupId } = req.query;
    if (!groupId) {
      return res.status(400).json({ message: "Group ID is required" });
    }
    const groupIdValue = Array.isArray(groupId) ? groupId[0] : groupId;
    const result = await itemService.getSubItemsForPlatter(parseInt(groupIdValue));
    res.status(200).json(result);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "sub-items for platter"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

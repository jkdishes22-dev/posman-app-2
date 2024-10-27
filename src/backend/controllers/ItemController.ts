import { NextApiRequest, NextApiResponse } from "next";
import { ItemService } from "@services/ItemService";

const itemService = new ItemService();

export const createCategoryHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const { name } = req.body;
  try {
    const newCategory = await itemService.createCategory(name);
    res.status(201).json(newCategory);
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Error creating category" + error });
  }
};

export const fetchCategoriesHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    const categories = await itemService.fetchCategories();
    res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

export const fetchItemsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    const { category } = req.query;
    console.log("Fetching Items:", category);
    const items = await itemService.fetchItems(category);

    res.status(200).json(items);
  } catch (error) {
    console.log("Error fetching items:", error);
    res.status(500).json({ message: "Failed to fetch items", error });
  }
};

export const createItemHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    console.log("Creating Item:", req.body);
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

export const deleteCategoryHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    const { id } = req.query;
    await itemService.deleteCategory(Number(id));
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete category", error });
  }
};

export const updateItemHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    console.log("Updating Item:", req.body);
    const { id, name, code, price, category, pricelistItemId, isGroup } = req.body;
    const user_id = req.user.id; // Ensure that user_id is correctly obtained from the request

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
    );

    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: "Failed to update item", error });
  }
};

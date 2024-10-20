import { NextApiRequest, NextApiResponse } from "next";
import { MenuService } from "@services/MenuService";

const menuService = new MenuService();

export const createCategoryHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const { name } = req.body;
  try {
    const newCategory = await menuService.createCategory(name);
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
    const categories = await menuService.fetchCategories();
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
    const items = await menuService.fetchItems(category);

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
    const newItem = req.body;
    const item = await menuService.createItem(newItem);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to create item", error });
  }
};

export const createItemTypeHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    const newItemType = req.body;
    const item = await menuService.createItemType(newItemType);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to create item type", error });
  }
};

export const fetchItemTypesHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    const itemTypes = await menuService.fetchItemTypes();
    res.status(201).json(itemTypes);
  } catch (error) {
    res.status(500).json({ error: "Error fetching item types" + error });
  }
};

export const deleteCategoryHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    const { id } = req.query;
    await menuService.deleteCategory(Number(id));
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete category", error });
  }
};

export const updateItemHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const { id } = req.query;
  const updateData = req.body;

  try {
    const updatedItem = await menuService.updateItem(Number(id), updateData); // Pass the ID and update data to the service

    if (!updatedItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    return res.status(200).json(updatedItem); // Return the updated item
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error updating item", error });
  }
};

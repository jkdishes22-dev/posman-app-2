import { CategoryService } from "@backend/service/CategoryService";
import { NextApiRequest, NextApiResponse } from "next";

export const createCategoryHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const { name } = req.body;
  const categoryService = new CategoryService(req.db);
  try {
    const newCategory = await categoryService.createCategory(name);
    res.status(201).json(newCategory);
  } catch (error: any) {
    console.error("Error creating category:", error);

    // Handle duplicate entry error
    if (error.code === "ER_DUP_ENTRY" && error.sqlMessage?.includes("unique_name_idx")) {
      return res.status(400).json({
        message: `Category "${name}" already exists. Please choose a different name.`,
        code: "DUPLICATE_CATEGORY"
      });
    }

    // Handle other errors
    res.status(500).json({
      message: "Failed to create category",
      error: error.message
    });
  }
};

export const fetchCategoriesHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const categoryService = new CategoryService(req.db);
  try {
    const categories = await categoryService.fetchCategories();
    res.status(200).json(categories);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch categories", error });
  }
};

export const deleteCategoryHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const categoryService = new CategoryService(req.db);
  try {
    const { id } = req.query;
    await categoryService.deleteCategory(Number(id));
    res.status(204).end();
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete category", error });
  }
};

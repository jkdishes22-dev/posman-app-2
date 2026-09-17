import { CategoryService } from "@backend/service/CategoryService";
import { NextApiRequest, NextApiResponse } from "next";
import { handleApiError } from "@backend/utils/errorHandler";

export const createCategoryHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const { name, code } = req.body;
  const categoryService = new CategoryService(req.db);
  try {
    const newCategory = await categoryService.createCategory(name, code || undefined);
    res.status(201).json(newCategory);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "creating",
      resource: "category"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
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
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "categories"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const updateCategoryHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const categoryService = new CategoryService(req.db);
  try {
    const { id } = req.query;
    const { name, code } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Category name is required" });
    await categoryService.updateCategory(Number(id), name.trim(), code?.trim() || null);
    res.status(200).json({ message: "Category updated successfully" });
  } catch (error: any) {
    if (error.statusCode === 404) return res.status(404).json({ error: error.message });
    const { userMessage, errorCode } = handleApiError(error, { operation: "updating", resource: "category" });
    res.status(500).json({ error: userMessage, code: errorCode });
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
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "deleting",
      resource: "category"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

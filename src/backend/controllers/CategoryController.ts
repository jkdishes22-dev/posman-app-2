import { CategoryService } from "@backend/service/CategoryService";
import { NextApiRequest, NextApiResponse } from "next";
import { handleApiError } from "@backend/utils/errorHandler";

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

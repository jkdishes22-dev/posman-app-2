import { CategoryService } from "@backend/service/CategoryService";
import { NextApiRequest, NextApiResponse } from "next";
import Container from "typedi";

const categoryService = Container.get(CategoryService);

export const createCategoryHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const { name } = req.body;
    try {
        const newCategory = await categoryService.createCategory(name);
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
        const categories = await categoryService.fetchCategories();
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch categories", error });
    }
};

export const deleteCategoryHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    try {
        const { id } = req.query;
        await categoryService.deleteCategory(Number(id));
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ message: "Failed to delete category", error });
    }
};
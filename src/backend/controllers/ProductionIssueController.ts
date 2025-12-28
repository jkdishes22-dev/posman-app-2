import { ProductionIssueService } from "@backend/service/ProductionIssueService";
import { ProductionIssueStatus } from "@backend/entities/ProductionIssue";
import { NextApiRequest, NextApiResponse } from "next";

export const createProductionIssueHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const productionIssueService = new ProductionIssueService(req.db);
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const productionIssue = await productionIssueService.createProductionIssue(
            req.body,
            userId
        );
        res.status(201).json(productionIssue);
    } catch (error: any) {
        console.error("Error creating production issue:", error);
        res.status(500).json({
            message: "Failed to create production issue",
            error: error.message,
        });
    }
};

export const fetchProductionIssuesHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const productionIssueService = new ProductionIssueService(req.db);
    try {
        const filters: any = {};

        if (req.query.item_id) {
            filters.item_id = Number(req.query.item_id);
        }
        if (req.query.status) {
            filters.status = req.query.status as ProductionIssueStatus;
        }
        if (req.query.issued_by) {
            filters.issued_by = Number(req.query.issued_by);
        }
        if (req.query.start_date) {
            filters.start_date = new Date(req.query.start_date as string);
        }
        if (req.query.end_date) {
            filters.end_date = new Date(req.query.end_date as string);
        }

        const limit = req.query.limit ? Number(req.query.limit) : 100;
        const offset = req.query.offset ? Number(req.query.offset) : 0;

        const result = await productionIssueService.fetchProductionIssues(filters, limit, offset);
        res.status(200).json(result);
    } catch (error: any) {
        console.error("Error fetching production issues:", error);
        res.status(500).json({
            message: "Failed to fetch production issues",
            error: error.message,
        });
    }
};

export const fetchProductionIssueHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const productionIssueService = new ProductionIssueService(req.db);
    try {
        const { id } = req.query;
        const productionIssue = await productionIssueService.fetchProductionIssueById(Number(id));

        if (!productionIssue) {
            return res.status(404).json({ message: "Production issue not found" });
        }

        res.status(200).json(productionIssue);
    } catch (error: any) {
        console.error("Error fetching production issue:", error);
        res.status(500).json({
            message: "Failed to fetch production issue",
            error: error.message,
        });
    }
};


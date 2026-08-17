import { ProductionSessionService, CreateProductionInput } from "@backend/service/ProductionSessionService";
import { ProductionStatus } from "@backend/entities/Production";
import { NextApiRequest, NextApiResponse } from "next";
import { handleApiError } from "@backend/utils/errorHandler";

export const createProductionHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const svc = new ProductionSessionService(req.db);
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const { name, description } = req.body as CreateProductionInput;
        if (!name?.trim()) return res.status(400).json({ message: "name is required" });
        const production = await svc.createProduction({ name, description }, userId);
        res.status(201).json(production);
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, { operation: "creating", resource: "production" });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const fetchProductionsHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const svc = new ProductionSessionService(req.db);
    try {
        const filters: Parameters<typeof svc.fetchProductions>[0] = {};
        if (req.query.status) filters.status = req.query.status as ProductionStatus;
        if (req.query.search) filters.search = req.query.search as string;
        if (req.query.start_date) filters.start_date = new Date(req.query.start_date as string);
        if (req.query.end_date) filters.end_date = new Date(req.query.end_date as string);
        filters.limit = req.query.limit ? Number(req.query.limit) : 100;
        filters.offset = req.query.offset ? Number(req.query.offset) : 0;
        const result = await svc.fetchProductions(filters);
        res.status(200).json(result);
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, { operation: "fetching", resource: "productions" });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const fetchProductionHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const svc = new ProductionSessionService(req.db);
    try {
        const production = await svc.fetchProductionById(Number(req.query.id));
        if (!production) return res.status(404).json({ message: "Production not found" });
        res.status(200).json(production);
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, { operation: "fetching", resource: "production" });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const deleteProductionHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const svc = new ProductionSessionService(req.db);
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const result = await svc.deleteProduction(Number(req.query.id), userId);
        res.status(200).json(result);
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, { operation: "deleting", resource: "production" });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const closeProductionHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const svc = new ProductionSessionService(req.db);
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const production = await svc.closeProduction(Number(req.query.id), userId);
        res.status(200).json(production);
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, { operation: "closing", resource: "production" });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

import { PurchaseItemService } from "@backend/service/PurchaseItemService";
import { NextApiRequest, NextApiResponse } from "next";
import { handleApiError } from "@backend/utils/errorHandler";

export const listPurchaseItemsHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const service = new PurchaseItemService(req.db);
    try {
        const activeOnly = req.query.active === "true";
        const items = await service.list(activeOnly);
        res.status(200).json({ items });
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, { operation: "listing", resource: "purchase items" });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const createPurchaseItemHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const service = new PurchaseItemService(req.db);
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const record = await service.create(req.body, userId);
        res.status(201).json(record);
    } catch (error: any) {
        const msg = error?.message || "";
        const isValidation =
            msg.includes("not found") ||
            msg.includes("not active") ||
            msg.includes("group product") ||
            msg.includes("not marked as suppliable") ||
            msg.includes("already exists");
        const { userMessage, errorCode } = handleApiError(error, { operation: "creating", resource: "purchase item" });
        res.status(isValidation ? 400 : 500).json({ error: userMessage, code: errorCode });
    }
};

export const getPurchaseItemHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const service = new PurchaseItemService(req.db);
    try {
        const id = Number(req.query.id);
        const record = await service.getById(id);
        if (!record) return res.status(404).json({ error: "Purchase item not found" });
        res.status(200).json(record);
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, { operation: "fetching", resource: "purchase item" });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const updatePurchaseItemHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const service = new PurchaseItemService(req.db);
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const id = Number(req.query.id);
        const record = await service.update(id, req.body, userId);
        res.status(200).json(record);
    } catch (error: any) {
        const msg = error?.message || "";
        const isNotFound = msg.includes("not found");
        const { userMessage, errorCode } = handleApiError(error, { operation: "updating", resource: "purchase item" });
        res.status(isNotFound ? 404 : 500).json({ error: userMessage, code: errorCode });
    }
};

export const deletePurchaseItemHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const service = new PurchaseItemService(req.db);
    try {
        const id = Number(req.query.id);
        await service.delete(id);
        res.status(204).end();
    } catch (error: any) {
        const msg = error?.message || "";
        const isNotFound = msg.includes("not found");
        const { userMessage, errorCode } = handleApiError(error, { operation: "deleting", resource: "purchase item" });
        res.status(isNotFound ? 404 : 500).json({ error: userMessage, code: errorCode });
    }
};

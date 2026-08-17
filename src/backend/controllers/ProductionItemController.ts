import { ProductionItemService, IssueProductionItemInput, UpdateProductionItemInput } from "@backend/service/ProductionItemService";
import { NextApiRequest, NextApiResponse } from "next";
import { handleApiError } from "@backend/utils/errorHandler";

export const issueProductionItemHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const svc = new ProductionItemService(req.db);
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const production_id = Number(req.query.id);
        const { item_id, quantity_produced, notes, issue_date } = req.body;
        if (!item_id || !quantity_produced) {
            return res.status(400).json({ message: "item_id and quantity_produced are required" });
        }
        let issuedAt: Date | undefined;
        if (issue_date) {
            // Parse as EAT midnight (UTC+3) so the stored UTC value reflects the correct local date
            const d = new Date(`${issue_date}T00:00:00+03:00`);
            if (!isNaN(d.getTime())) issuedAt = d;
        }
        const input: IssueProductionItemInput = {
            production_id,
            item_id: Number(item_id),
            quantity_produced: Number(quantity_produced),
            notes: notes || undefined,
            issued_at: issuedAt,
        };
        const item = await svc.issueItem(input, userId);
        res.status(201).json(item);
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, { operation: "issuing", resource: "production item" });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const fetchProductionItemsHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const svc = new ProductionItemService(req.db);
    try {
        const filters: Parameters<typeof svc.fetchItems>[0] = {};
        if (req.query.id) filters.production_id = Number(req.query.id);
        if (req.query.item_id) filters.item_id = Number(req.query.item_id);
        if (req.query.issued_by) filters.issued_by = Number(req.query.issued_by);
        if (req.query.start_date) filters.start_date = new Date(req.query.start_date as string);
        if (req.query.end_date) filters.end_date = new Date(req.query.end_date as string);
        const limit = req.query.limit ? Number(req.query.limit) : 100;
        const offset = req.query.offset ? Number(req.query.offset) : 0;
        const result = await svc.fetchItems(filters, limit, offset);
        res.status(200).json(result);
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, { operation: "fetching", resource: "production items" });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const updateProductionItemHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const svc = new ProductionItemService(req.db);
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const itemId = Number(req.query.itemId);
        if (!itemId) return res.status(400).json({ error: "itemId is required" });
        const { item_id, quantity_produced, notes, issue_date } = req.body;
        const input: UpdateProductionItemInput = {};
        if (item_id != null) input.item_id = Number(item_id);
        if (quantity_produced != null) input.quantity_produced = Number(quantity_produced);
        if (notes !== undefined) input.notes = notes ?? null;
        if (issue_date) {
            const d = new Date(`${issue_date}T00:00:00+03:00`);
            if (!isNaN(d.getTime())) input.issued_at = d;
        }
        const updated = await svc.updateItem(itemId, input, userId);
        res.status(200).json(updated);
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, { operation: "updating", resource: "production item" });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const cancelProductionItemHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const svc = new ProductionItemService(req.db);
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const itemId = Number(req.query.itemId);
        if (!itemId) return res.status(400).json({ error: "itemId is required" });
        await svc.cancelItem(itemId, userId);
        res.status(200).json({ cancelled: true });
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, { operation: "cancelling", resource: "production item" });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const fetchAllProductionItemsHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const svc = new ProductionItemService(req.db);
    try {
        const filters: Parameters<typeof svc.fetchItems>[0] = {};
        if (req.query.production_id) filters.production_id = Number(req.query.production_id);
        if (req.query.item_id) filters.item_id = Number(req.query.item_id);
        if (req.query.issued_by) filters.issued_by = Number(req.query.issued_by);
        if (req.query.status) filters.status = req.query.status as string;
        if (req.query.item_search) filters.item_search = req.query.item_search as string;
        if (req.query.start_date) filters.start_date = new Date(req.query.start_date as string);
        if (req.query.end_date) filters.end_date = new Date(req.query.end_date as string);
        const limit = req.query.limit ? Number(req.query.limit) : 100;
        const offset = req.query.offset ? Number(req.query.offset) : 0;
        const result = await svc.fetchItems(filters, limit, offset);
        res.status(200).json(result);
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, { operation: "fetching", resource: "production items" });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

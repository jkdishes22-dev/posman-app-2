import { PurchaseOrderService } from "@backend/service/PurchaseOrderService";
import { NextApiRequest, NextApiResponse } from "next";

export const createPurchaseOrderHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const poService = new PurchaseOrderService(req.db);
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const purchaseOrder = await poService.createPurchaseOrder(req.body, userId);
        res.status(201).json(purchaseOrder);
    } catch (error: any) {
        console.error("Error creating purchase order:", error);
        res.status(500).json({
            message: "Failed to create purchase order",
            error: error.message,
        });
    }
};

export const fetchPurchaseOrdersHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const poService = new PurchaseOrderService(req.db);
    try {
        const filters: any = {};

        if (req.query.status) {
            filters.status = req.query.status;
        }
        if (req.query.supplier_id) {
            filters.supplier_id = Number(req.query.supplier_id);
        }
        if (req.query.start_date) {
            filters.start_date = new Date(req.query.start_date as string);
        }
        if (req.query.end_date) {
            filters.end_date = new Date(req.query.end_date as string);
        }
        if (req.query.limit) {
            filters.limit = Number(req.query.limit);
        }

        const purchaseOrders = await poService.fetchPurchaseOrders(filters);
        res.status(200).json(purchaseOrders);
    } catch (error: any) {
        console.error("Error fetching purchase orders:", error);
        res.status(500).json({
            message: "Failed to fetch purchase orders",
            error: error.message,
        });
    }
};

export const fetchPurchaseOrderHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const poService = new PurchaseOrderService(req.db);
    try {
        const { id } = req.query;
        const purchaseOrder = await poService.fetchPurchaseOrderById(Number(id));

        if (!purchaseOrder) {
            return res.status(404).json({ message: "Purchase order not found" });
        }

        res.status(200).json(purchaseOrder);
    } catch (error: any) {
        console.error("Error fetching purchase order:", error);
        res.status(500).json({
            message: "Failed to fetch purchase order",
            error: error.message,
        });
    }
};

export const updatePurchaseOrderHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const poService = new PurchaseOrderService(req.db);
    try {
        const { id } = req.query;
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const purchaseOrder = await poService.updatePurchaseOrder(
            Number(id),
            req.body,
            userId
        );
        res.status(200).json(purchaseOrder);
    } catch (error: any) {
        console.error("Error updating purchase order:", error);
        res.status(500).json({
            message: "Failed to update purchase order",
            error: error.message,
        });
    }
};

export const receivePurchaseOrderHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const poService = new PurchaseOrderService(req.db);
    try {
        const { id } = req.query;
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const purchaseOrder = await poService.receivePurchaseOrder(
            Number(id),
            req.body,
            userId
        );
        res.status(200).json(purchaseOrder);
    } catch (error: any) {
        console.error("Error receiving purchase order:", error);
        res.status(500).json({
            message: "Failed to receive purchase order",
            error: error.message,
        });
    }
};

export const cancelPurchaseOrderHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const poService = new PurchaseOrderService(req.db);
    try {
        const { id } = req.query;
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const purchaseOrder = await poService.cancelPurchaseOrder(Number(id), userId);
        res.status(200).json(purchaseOrder);
    } catch (error: any) {
        console.error("Error cancelling purchase order:", error);
        res.status(500).json({
            message: "Failed to cancel purchase order",
            error: error.message,
        });
    }
};


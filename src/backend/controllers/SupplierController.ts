import { SupplierService } from "@backend/service/SupplierService";
import { NextApiRequest, NextApiResponse } from "next";

export const createSupplierHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const supplierService = new SupplierService(req.db);
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const supplier = await supplierService.createSupplier(req.body, userId);
        res.status(201).json(supplier);
    } catch (error: any) {
        console.error("Error creating supplier:", error);
        res.status(500).json({
            message: "Failed to create supplier",
            error: error.message,
        });
    }
};

export const fetchSuppliersHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const supplierService = new SupplierService(req.db);
    try {
        const suppliers = await supplierService.fetchSuppliers();
        res.status(200).json(suppliers);
    } catch (error: any) {
        console.error("Error fetching suppliers:", error);
        res.status(500).json({
            message: "Failed to fetch suppliers",
            error: error.message,
        });
    }
};

export const fetchSupplierHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const supplierService = new SupplierService(req.db);
    try {
        const { id } = req.query;
        const supplier = await supplierService.fetchSupplierById(Number(id));

        if (!supplier) {
            return res.status(404).json({ message: "Supplier not found" });
        }

        // Get balance information
        const balance = await supplierService.getSupplierBalance(Number(id));

        res.status(200).json({
            ...supplier,
            balance,
        });
    } catch (error: any) {
        console.error("Error fetching supplier:", error);
        res.status(500).json({
            message: "Failed to fetch supplier",
            error: error.message,
        });
    }
};

export const updateSupplierHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const supplierService = new SupplierService(req.db);
    try {
        const { id } = req.query;
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const supplier = await supplierService.updateSupplier(
            Number(id),
            req.body,
            userId
        );
        res.status(200).json(supplier);
    } catch (error: any) {
        console.error("Error updating supplier:", error);
        res.status(500).json({
            message: "Failed to update supplier",
            error: error.message,
        });
    }
};

export const deleteSupplierHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const supplierService = new SupplierService(req.db);
    try {
        const { id } = req.query;
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        await supplierService.deleteSupplier(Number(id), userId);
        res.status(204).end();
    } catch (error: any) {
        console.error("Error deleting supplier:", error);
        res.status(500).json({
            message: "Failed to delete supplier",
            error: error.message,
        });
    }
};

export const getSupplierBalanceHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const supplierService = new SupplierService(req.db);
    try {
        const { id } = req.query;
        const balance = await supplierService.getSupplierBalance(Number(id));
        res.status(200).json(balance);
    } catch (error: any) {
        console.error("Error fetching supplier balance:", error);
        res.status(500).json({
            message: "Failed to fetch supplier balance",
            error: error.message,
        });
    }
};

export const getSupplierTransactionsHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const supplierService = new SupplierService(req.db);
    try {
        const { id } = req.query;
        const limit = req.query.limit ? Number(req.query.limit) : 100;
        const transactions = await supplierService.getSupplierTransactions(
            Number(id),
            limit
        );
        res.status(200).json(transactions);
    } catch (error: any) {
        console.error("Error fetching supplier transactions:", error);
        res.status(500).json({
            message: "Failed to fetch supplier transactions",
            error: error.message,
        });
    }
};


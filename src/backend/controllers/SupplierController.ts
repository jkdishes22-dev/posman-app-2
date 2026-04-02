import { SupplierService } from "@backend/service/SupplierService";
import { NextApiRequest, NextApiResponse } from "next";
import { handleApiError } from "@backend/utils/errorHandler";

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
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "creating",
            resource: "supplier"
        });
        res.status(500).json({ error: userMessage, code: errorCode });
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
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "fetching",
            resource: "suppliers"
        });
        res.status(500).json({ error: userMessage, code: errorCode });
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
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "fetching",
            resource: "supplier"
        });
        res.status(500).json({ error: userMessage, code: errorCode });
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
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "updating",
            resource: "supplier"
        });
        res.status(500).json({ error: userMessage, code: errorCode });
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
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "deleting",
            resource: "supplier"
        });
        res.status(500).json({ error: userMessage, code: errorCode });
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
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "fetching",
            resource: "supplier balance"
        });
        res.status(500).json({ error: userMessage, code: errorCode });
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
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "fetching",
            resource: "supplier transactions"
        });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const recordSupplierCreditHandler = async (
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

        const supplierId = Number(id);
        if (!Number.isFinite(supplierId)) {
            return res.status(400).json({ message: "Invalid supplier id" });
        }

        const { transaction_type, amount, notes, reference } = req.body || {};
        if (transaction_type !== "payment" && transaction_type !== "adjustment") {
            return res.status(400).json({
                message: "transaction_type must be payment or adjustment",
            });
        }

        const numAmount = typeof amount === "string" ? parseFloat(amount) : Number(amount);
        if (!Number.isFinite(numAmount)) {
            return res.status(400).json({ message: "amount is required and must be a number" });
        }

        const transaction = await supplierService.recordSupplierCreditTransaction(
            supplierId,
            transaction_type,
            numAmount,
            Number(userId),
            {
                notes: typeof notes === "string" ? notes : undefined,
                externalReference: typeof reference === "string" ? reference : undefined,
            },
        );

        res.status(200).json(transaction);
    } catch (error: any) {
        const msg = error?.message || "";
        if (
            msg.includes("exceeds") ||
            msg.includes("required") ||
            msg.includes("must be positive") ||
            msg.includes("No outstanding") ||
            msg.includes("not found")
        ) {
            const status = msg.includes("not found") ? 404 : 400;
            return res.status(status).json({ message: msg });
        }
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "recording",
            resource: "supplier credit transaction",
        });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

import { SupplierService } from "@backend/service/SupplierService";
import { SupplierPaymentService } from "@backend/service/SupplierPaymentService";
import { SupplierPaymentAction } from "@backend/entities/SupplierPayment";
import { PaymentType } from "@backend/entities/Payment";
import { NextApiRequest, NextApiResponse } from "next";
import { handleApiError } from "@backend/utils/errorHandler";
import { startOfDay, endOfDay } from "date-fns";
import { SupplierTransactionType } from "@backend/entities/SupplierTransaction";

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

        const { payment_type, amount, action, action_reference_id, notes, reference, transaction_type } = req.body || {};

        const numAmount = typeof amount === "string" ? parseFloat(amount) : Number(amount);
        if (!Number.isFinite(numAmount)) {
            return res.status(400).json({ message: "amount is required and must be a number" });
        }

        // Adjustment path — ledger-only, no payment record
        if (transaction_type === "adjustment") {
            const supplierService = new SupplierService(req.db);
            const transaction = await supplierService.recordSupplierCreditTransaction(
                supplierId,
                "adjustment",
                numAmount,
                Number(userId),
                {
                    notes: typeof notes === "string" ? notes : undefined,
                    externalReference: typeof reference === "string" ? reference : undefined,
                },
            );
            return res.status(200).json(transaction);
        }

        // Payment path — creates Payment + SupplierPayment + SupplierTransaction
        const allowedActions = Object.values(SupplierPaymentAction) as string[];
        if (!action || !allowedActions.includes(action)) {
            return res.status(400).json({
                message: `action must be one of: ${allowedActions.join(", ")}`,
            });
        }

        const allowedPaymentTypes = Object.values(PaymentType) as string[];
        if (!payment_type || !allowedPaymentTypes.includes(payment_type)) {
            return res.status(400).json({
                message: `payment_type must be one of: ${allowedPaymentTypes.join(", ")}`,
            });
        }

        if (!notes?.trim()) {
            return res.status(400).json({ message: "notes are required for supplier payments" });
        }

        const refId =
            action_reference_id != null && String(action_reference_id).trim() !== ""
                ? Number(action_reference_id)
                : null;

        const supplierPaymentService = new SupplierPaymentService(req.db);
        const sp = await supplierPaymentService.recordPayment(
            {
                supplierId,
                paymentType: payment_type as PaymentType,
                amount: numAmount,
                action: action as SupplierPaymentAction,
                actionReferenceId: refId,
                notes: String(notes).trim(),
                reference: typeof reference === "string" ? reference : null,
            },
            Number(userId),
        );

        return res.status(200).json(sp);
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
            resource: "supplier payment",
        });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

/** GET /api/suppliers/transactions — paginated ledger across suppliers (filters optional). */
export const listAllSupplierTransactionsHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const supplierService = new SupplierService(req.db);
    try {
        const pageRaw = req.query.page ? parseInt(String(req.query.page), 10) : 1;
        const pageSizeRaw = req.query.pageSize ? parseInt(String(req.query.pageSize), 10) : 25;
        const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
        const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? pageSizeRaw : 25;

        const supplierIdRaw = req.query.supplierId;
        const supplierIdParsed =
            supplierIdRaw != null && String(supplierIdRaw).trim() !== ""
                ? parseInt(String(supplierIdRaw), 10)
                : NaN;
        const supplierId = Number.isFinite(supplierIdParsed) ? supplierIdParsed : undefined;

        let transactionType: SupplierTransactionType | undefined;
        const ttRaw = req.query.transactionType;
        if (typeof ttRaw === "string" && ttRaw.trim() !== "" && ttRaw !== "all") {
            const allowed = Object.values(SupplierTransactionType) as string[];
            if (allowed.includes(ttRaw)) {
                transactionType = ttRaw as SupplierTransactionType;
            }
        }

        let startDate: Date | undefined;
        let endDate: Date | undefined;
        if (typeof req.query.startDate === "string" && req.query.startDate.trim()) {
            startDate = startOfDay(new Date(req.query.startDate));
        }
        if (typeof req.query.endDate === "string" && req.query.endDate.trim()) {
            endDate = endOfDay(new Date(req.query.endDate));
        }

        const { items, total } = await supplierService.listSupplierTransactionsPaginated({
            supplierId,
            transactionType,
            startDate,
            endDate,
            page,
            pageSize,
        });

        res.status(200).json({
            transactions: items,
            total,
            page,
            pageSize,
        });
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, {
            operation: "fetching",
            resource: "supplier transactions"
        });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

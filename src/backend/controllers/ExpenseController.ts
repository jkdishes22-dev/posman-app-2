import { NextApiRequest, NextApiResponse } from "next";
import { ExpenseService } from "@backend/service/ExpenseService";
import { handleApiError } from "@backend/utils/errorHandler";

export const fetchExpensesHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const expenseService = new ExpenseService(req.db);
    try {
        const page = req.query.page ? Number(req.query.page) : 1;
        const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;
        const result = await expenseService.getExpenses(page, pageSize);
        res.status(200).json(result);
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, { operation: "fetching", resource: "expenses" });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const createExpenseHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const expenseService = new ExpenseService(req.db);
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        const expense = await expenseService.createExpense(req.body, Number(userId));
        res.status(201).json(expense);
    } catch (error: any) {
        const isValidation = error?.message && (
            error.message.includes("required") ||
            error.message.includes("greater than")
        );
        const { userMessage, errorCode } = handleApiError(error, { operation: "creating", resource: "expense" });
        res.status(isValidation ? 400 : 500).json({ error: userMessage, code: errorCode });
    }
};

export const fetchExpenseHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const expenseService = new ExpenseService(req.db);
    try {
        const { id } = req.query;
        const expense = await expenseService.getExpense(Number(id));
        if (!expense) return res.status(404).json({ error: "Expense not found" });
        res.status(200).json(expense);
    } catch (error: any) {
        const { userMessage, errorCode } = handleApiError(error, { operation: "fetching", resource: "expense" });
        res.status(500).json({ error: userMessage, code: errorCode });
    }
};

export const recordExpensePaymentHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const expenseService = new ExpenseService(req.db);
    try {
        const { id } = req.query;
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        const payment = await expenseService.recordPayment(Number(id), req.body, Number(userId));
        res.status(201).json(payment);
    } catch (error: any) {
        const isValidation = error?.message && (
            error.message.includes("not found") ||
            error.message.includes("greater than") ||
            error.message.includes("already") ||
            error.message.includes("remaining balance") ||
            error.message.includes("no remaining balance") ||
            error.message.includes("reference is already")
        );
        const { userMessage, errorCode } = handleApiError(error, { operation: "recording", resource: "expense payment" });
        res.status(isValidation ? 400 : 500).json({ error: userMessage, code: errorCode });
    }
};

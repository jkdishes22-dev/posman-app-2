import { DataSource, Repository } from "typeorm";
import { Expense, ExpenseStatus } from "@backend/entities/Expense";
import { ExpensePayment } from "@backend/entities/ExpensePayment";

export interface CreateExpenseInput {
    category: string;
    description: string;
    amount: number;
    expense_date?: string;
    notes?: string;
}

export interface RecordPaymentInput {
    amount: number;
    payment_method?: string;
    /** e.g. M-Pesa confirmation code */
    reference?: string;
    notes?: string;
}

export class ExpenseService {
    private expenseRepo: Repository<Expense>;
    private paymentRepo: Repository<ExpensePayment>;

    constructor(dataSource: DataSource) {
        this.expenseRepo = dataSource.getRepository(Expense);
        this.paymentRepo = dataSource.getRepository(ExpensePayment);
    }

    async getExpenses(page = 1, pageSize = 20) {
        const [expenses, total] = await this.expenseRepo.findAndCount({
            relations: ["payments"],
            order: { expense_date: "DESC", id: "DESC" },
            take: pageSize,
            skip: (page - 1) * pageSize,
        });

        const items = expenses.map((e) => {
            const paid = (e.payments || []).reduce((s, p) => s + Number(p.amount), 0);
            return { ...e, paid, balance: Number(e.amount) - paid };
        });

        return { items, total, page, pageSize };
    }

    async getExpense(id: number) {
        const expense = await this.expenseRepo.findOne({ where: { id }, relations: ["payments"] });
        if (!expense) return null;
        const paid = (expense.payments || []).reduce((s, p) => s + Number(p.amount), 0);
        return { ...expense, paid, balance: Number(expense.amount) - paid };
    }

    async createExpense(data: CreateExpenseInput, userId: number) {
        if (!data.category?.trim()) throw new Error("Category is required");
        if (!data.description?.trim()) throw new Error("Description is required");
        if (!data.amount || Number(data.amount) <= 0) throw new Error("Amount must be greater than 0");

        const expense = this.expenseRepo.create({
            category: data.category.trim(),
            description: data.description.trim(),
            amount: Number(data.amount),
            expense_date: data.expense_date ? new Date(data.expense_date) : new Date(),
            notes: data.notes?.trim() || undefined,
            status: ExpenseStatus.OPEN,
            created_by: userId,
        });
        return this.expenseRepo.save(expense);
    }

    async recordPayment(expenseId: number, data: RecordPaymentInput, userId: number) {
        const expense = await this.expenseRepo.findOne({ where: { id: expenseId }, relations: ["payments"] });
        if (!expense) throw new Error("Expense not found");
        if (expense.status === ExpenseStatus.SETTLED) throw new Error("Expense is already fully settled");

        const payAmount = Number(data.amount);
        if (!payAmount || payAmount <= 0) throw new Error("Payment amount must be greater than 0");

        const refNorm = data.reference?.trim();
        const payment = this.paymentRepo.create({
            expense_id: expenseId,
            amount: payAmount,
            payment_method: data.payment_method || "cash",
            reference: refNorm ? refNorm.toUpperCase() : undefined,
            notes: data.notes?.trim() || undefined,
            created_by: userId,
        });
        await this.paymentRepo.save(payment);

        const refreshed = await this.expenseRepo.findOne({ where: { id: expenseId }, relations: ["payments"] });
        const allPayments = refreshed?.payments || [];
        const paid = allPayments.reduce((s, p) => s + Number(p.amount), 0);
        const total = Number(expense.amount);

        expense.status = paid >= total ? ExpenseStatus.SETTLED : paid > 0 ? ExpenseStatus.PARTIAL : ExpenseStatus.OPEN;
        expense.updated_by = userId;
        await this.expenseRepo.save(expense);

        return payment;
    }
}

import { DataSource, Repository } from "typeorm";
import { Expense, ExpenseStatus } from "@backend/entities/Expense";
import { ExpensePayment } from "@backend/entities/ExpensePayment";
import { Payment, PaymentType } from "@backend/entities/Payment";

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

function toPaymentType(method: string | undefined): PaymentType {
    const m = (method || "cash").toLowerCase();
    if (m === "cash") return PaymentType.CASH;
    return PaymentType.MPESA;
}

export class ExpenseService {
    private expenseRepo: Repository<Expense>;
    private expensePaymentRepo: Repository<ExpensePayment>;
    private paymentRepo: Repository<Payment>;

    constructor(dataSource: DataSource) {
        this.expenseRepo = dataSource.getRepository(Expense);
        this.expensePaymentRepo = dataSource.getRepository(ExpensePayment);
        this.paymentRepo = dataSource.getRepository(Payment);
    }

    async getExpenses(page = 1, pageSize = 20) {
        const [expenses, total] = await this.expenseRepo.findAndCount({
            relations: ["payments", "payments.payment"],
            order: { expense_date: "DESC", id: "DESC" },
            take: pageSize,
            skip: (page - 1) * pageSize,
        });

        const items = expenses.map((e) => {
            const paid = (e.payments || []).reduce((s, p) => s + Number(p.payment?.debitAmount ?? 0), 0);
            return { ...e, paid, balance: Number(e.amount) - paid };
        });

        return { items, total, page, pageSize };
    }

    async getExpense(id: number) {
        const expense = await this.expenseRepo.findOne({
            where: { id },
            relations: ["payments", "payments.payment"],
        });
        if (!expense) return null;
        const paid = (expense.payments || []).reduce((s, p) => s + Number(p.payment?.debitAmount ?? 0), 0);
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
        const expense = await this.expenseRepo.findOne({
            where: { id: expenseId },
            relations: ["payments", "payments.payment"],
        });
        if (!expense) throw new Error("Expense not found");
        if (expense.status === ExpenseStatus.SETTLED) throw new Error("Expense is already fully settled");

        const payAmount = Number(data.amount);
        if (!payAmount || payAmount <= 0) throw new Error("Payment amount must be greater than 0");

        const refNorm = data.reference?.trim() ? data.reference.trim().toUpperCase() : null;
        const paymentType = toPaymentType(data.payment_method);

        // Create the shared Payment record (debitAmount = money leaving the business)
        const payment = this.paymentRepo.create({
            debitAmount: payAmount,
            creditAmount: 0,
            paymentType,
            reference: refNorm,
            created_by: userId,
        });
        const savedPayment = await this.paymentRepo.save(payment);

        // Create the ExpensePayment linking expense → payment
        const expensePayment = this.expensePaymentRepo.create({
            expense: { id: expenseId } as Expense,
            payment: { id: savedPayment.id } as Payment,
            notes: data.notes?.trim() || null,
            created_by: userId,
        });
        await this.expensePaymentRepo.save(expensePayment);

        // Recalculate settled status
        const refreshed = await this.expenseRepo.findOne({
            where: { id: expenseId },
            relations: ["payments", "payments.payment"],
        });
        const allPayments = refreshed?.payments || [];
        const paid = allPayments.reduce((s, p) => s + Number(p.payment?.debitAmount ?? 0), 0);
        const total = Number(expense.amount);

        expense.status = paid >= total ? ExpenseStatus.SETTLED : paid > 0 ? ExpenseStatus.PARTIAL : ExpenseStatus.OPEN;
        expense.updated_by = userId;
        await this.expenseRepo.save(expense);

        return expensePayment;
    }
}
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

    constructor(dataSource: DataSource) {
        this.expenseRepo = dataSource.getRepository(Expense);
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
        return await this.expenseRepo.manager.transaction(async (manager) => {
            const expenseRepo = manager.getRepository(Expense);
            const expensePaymentRepo = manager.getRepository(ExpensePayment);
            const paymentRepo = manager.getRepository(Payment);

            const expense = await expenseRepo.findOne({
                where: { id: expenseId },
                relations: ["payments", "payments.payment"],
            });
            if (!expense) throw new Error("Expense not found");
            if (expense.status === ExpenseStatus.SETTLED) throw new Error("Expense is already fully settled");

            const payAmount = Number(data.amount);
            if (!payAmount || payAmount <= 0) throw new Error("Payment amount must be greater than 0");

            const paidBefore = (expense.payments || []).reduce(
                (s, p) => s + Number(p.payment?.debitAmount ?? 0),
                0,
            );
            const totalAmt = Number(expense.amount);
            const balance = Math.round((totalAmt - paidBefore) * 100) / 100;
            if (balance <= 0) {
                throw new Error("This expense has no remaining balance to pay");
            }
            if (Math.round(payAmount * 100) > Math.round(balance * 100)) {
                throw new Error(
                    `Payment exceeds remaining balance (KES ${balance.toFixed(2)} outstanding)`,
                );
            }

            const refNorm = data.reference?.trim() ? data.reference.trim().toUpperCase() : null;
            if (refNorm) {
                const dup = await expensePaymentRepo
                    .createQueryBuilder("ep")
                    .innerJoin("ep.payment", "p")
                    .where("ep.expense_id = :eid", { eid: expenseId })
                    .andWhere("p.reference = :ref", { ref: refNorm })
                    .getOne();
                if (dup) {
                    throw new Error("A payment with this reference is already recorded for this expense");
                }
            }

            const paymentType = toPaymentType(data.payment_method);

            const payment = paymentRepo.create({
                debitAmount: payAmount,
                creditAmount: 0,
                paymentType,
                reference: refNorm,
                created_by: userId,
            });
            const savedPayment = await paymentRepo.save(payment);

            const expensePayment = expensePaymentRepo.create({
                expense: { id: expenseId } as Expense,
                payment: { id: savedPayment.id } as Payment,
                notes: data.notes?.trim() || null,
                created_by: userId,
            });
            const savedExpensePayment = await expensePaymentRepo.save(expensePayment);

            const refreshed = await expenseRepo.findOne({
                where: { id: expenseId },
                relations: ["payments", "payments.payment"],
            });
            const paid = (refreshed?.payments || []).reduce(
                (s, p) => s + Number(p.payment?.debitAmount ?? 0),
                0,
            );

            const newStatus =
                paid >= totalAmt
                    ? ExpenseStatus.SETTLED
                    : paid > 0
                      ? ExpenseStatus.PARTIAL
                      : ExpenseStatus.OPEN;

            // IMPORTANT: never `save(expense)` with `payments` loaded — TypeORM can emit
            // UPDATE expense_payment SET expense_id = NULL (NOT NULL failure on SQLite / MySQL quirks).
            await expenseRepo.update({ id: expenseId }, { status: newStatus, updated_by: userId });

            return savedExpensePayment;
        });
    }
}
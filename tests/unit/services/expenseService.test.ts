import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDataSource, createMockRepository } from "../mocks/createMockDataSource";
import { ExpenseService } from "@backend/service/ExpenseService";
import { ExpenseStatus } from "@backend/entities/Expense";
import { PaymentType } from "@backend/entities/Payment";

describe("ExpenseService", () => {
    let mockExpenseRepo: ReturnType<typeof createMockRepository>;
    let mockExpensePaymentRepo: ReturnType<typeof createMockRepository>;
    let mockPaymentRepo: ReturnType<typeof createMockRepository>;
    let service: ExpenseService;

    beforeEach(() => {
        vi.clearAllMocks();
        mockExpenseRepo = createMockRepository();
        mockExpensePaymentRepo = createMockRepository();
        mockPaymentRepo = createMockRepository();
        // findAndCount is not in the base mock — add it per repo
        mockExpenseRepo.findAndCount = vi.fn().mockResolvedValue([[], 0]);

        const mockDs = createMockDataSource({
            Expense: mockExpenseRepo,
            ExpensePayment: mockExpensePaymentRepo,
            Payment: mockPaymentRepo,
        });
        service = new ExpenseService(mockDs as any);
    });

    // ─── createExpense ────────────────────────────────────────────────────────

    describe("createExpense", () => {
        it("throws when category is missing", async () => {
            await expect(
                service.createExpense({ category: "", description: "Rent", amount: 1000 }, 1)
            ).rejects.toThrow("Category is required");
        });

        it("throws when description is missing", async () => {
            await expect(
                service.createExpense({ category: "Rent", description: "  ", amount: 1000 }, 1)
            ).rejects.toThrow("Description is required");
        });

        it("throws when amount is zero or negative", async () => {
            await expect(
                service.createExpense({ category: "Rent", description: "Monthly", amount: 0 }, 1)
            ).rejects.toThrow("Amount must be greater than 0");

            await expect(
                service.createExpense({ category: "Rent", description: "Monthly", amount: -50 }, 1)
            ).rejects.toThrow("Amount must be greater than 0");
        });

        it("creates and saves an expense with defaults", async () => {
            const saved = { id: 1, category: "Utilities", description: "Electricity", amount: 500, status: ExpenseStatus.OPEN };
            mockExpenseRepo.create.mockReturnValue(saved);
            mockExpenseRepo.save.mockResolvedValue(saved);

            const result = await service.createExpense(
                { category: "Utilities", description: "Electricity", amount: 500 },
                99
            );

            expect(mockExpenseRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    category: "Utilities",
                    description: "Electricity",
                    amount: 500,
                    status: ExpenseStatus.OPEN,
                    created_by: 99,
                })
            );
            expect(result).toEqual(saved);
        });
    });

    // ─── getExpenses ──────────────────────────────────────────────────────────

    describe("getExpenses", () => {
        it("returns paginated expenses with computed paid and balance", async () => {
            const expense = {
                id: 1,
                amount: 1000,
                payments: [
                    { payment: { debitAmount: 300 } },
                    { payment: { debitAmount: 200 } },
                ],
            };
            mockExpenseRepo.findAndCount.mockResolvedValue([[expense], 1]);

            const result = await service.getExpenses(1, 20);

            expect(result.items[0].paid).toBe(500);
            expect(result.items[0].balance).toBe(500);
            expect(result.total).toBe(1);
        });

        it("handles expenses with no payments (paid=0, balance=amount)", async () => {
            const expense = { id: 2, amount: 800, payments: [] };
            mockExpenseRepo.findAndCount.mockResolvedValue([[expense], 1]);

            const result = await service.getExpenses();

            expect(result.items[0].paid).toBe(0);
            expect(result.items[0].balance).toBe(800);
        });
    });

    // ─── getExpense ───────────────────────────────────────────────────────────

    describe("getExpense", () => {
        it("returns null when expense does not exist", async () => {
            mockExpenseRepo.findOne.mockResolvedValue(null);
            expect(await service.getExpense(999)).toBeNull();
        });

        it("returns expense with paid and balance computed from nested payment", async () => {
            const expense = {
                id: 5,
                amount: 2000,
                payments: [{ payment: { debitAmount: 750 } }],
            };
            mockExpenseRepo.findOne.mockResolvedValue(expense);

            const result = await service.getExpense(5);

            expect(result?.paid).toBe(750);
            expect(result?.balance).toBe(1250);
        });
    });

    // ─── recordPayment ────────────────────────────────────────────────────────

    describe("recordPayment", () => {
        it("throws when expense not found", async () => {
            mockExpenseRepo.findOne.mockResolvedValue(null);
            await expect(service.recordPayment(1, { amount: 100 }, 1)).rejects.toThrow("Expense not found");
        });

        it("throws when expense is already settled", async () => {
            mockExpenseRepo.findOne.mockResolvedValue({ id: 1, status: ExpenseStatus.SETTLED, payments: [] });
            await expect(service.recordPayment(1, { amount: 100 }, 1)).rejects.toThrow("already fully settled");
        });

        it("throws when payment amount is zero or negative", async () => {
            mockExpenseRepo.findOne.mockResolvedValue({ id: 1, status: ExpenseStatus.OPEN, amount: 500, payments: [] });
            await expect(service.recordPayment(1, { amount: 0 }, 1)).rejects.toThrow("Payment amount must be greater than 0");
        });

        it("creates Payment and ExpensePayment records on happy path", async () => {
            const expense = { id: 1, status: ExpenseStatus.OPEN, amount: 500, payments: [] };
            // First findOne: the expense; second findOne: refreshed expense with new payment
            mockExpenseRepo.findOne
                .mockResolvedValueOnce(expense)
                .mockResolvedValueOnce({
                    ...expense,
                    payments: [{ payment: { debitAmount: 300 } }],
                });

            const savedPayment = { id: 10, debitAmount: 300, paymentType: PaymentType.CASH };
            mockPaymentRepo.create.mockReturnValue(savedPayment);
            mockPaymentRepo.save.mockResolvedValue(savedPayment);

            const savedExpensePayment = { id: 20, expense: { id: 1 }, payment: { id: 10 } };
            mockExpensePaymentRepo.create.mockReturnValue(savedExpensePayment);
            mockExpensePaymentRepo.save.mockResolvedValue(savedExpensePayment);

            mockExpenseRepo.save.mockResolvedValue({});

            const result = await service.recordPayment(1, { amount: 300, payment_method: "cash" }, 99);

            // Payment created with correct fields
            expect(mockPaymentRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    debitAmount: 300,
                    creditAmount: 0,
                    paymentType: PaymentType.CASH,
                    created_by: 99,
                })
            );

            // ExpensePayment linked to both
            expect(mockExpensePaymentRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    expense: { id: 1 },
                    payment: { id: 10 },
                    created_by: 99,
                })
            );

            expect(result).toEqual(savedExpensePayment);
        });

        it("maps mpesa payment_method to PaymentType.MPESA", async () => {
            const expense = { id: 2, status: ExpenseStatus.OPEN, amount: 1000, payments: [] };
            mockExpenseRepo.findOne
                .mockResolvedValueOnce(expense)
                .mockResolvedValueOnce({ ...expense, payments: [{ payment: { debitAmount: 1000 } }] });

            mockPaymentRepo.create.mockReturnValue({ id: 11 });
            mockPaymentRepo.save.mockResolvedValue({ id: 11 });
            mockExpensePaymentRepo.create.mockReturnValue({});
            mockExpensePaymentRepo.save.mockResolvedValue({});
            mockExpenseRepo.save.mockResolvedValue({});

            await service.recordPayment(2, { amount: 1000, payment_method: "mpesa", reference: "  abc123 " }, 1);

            expect(mockPaymentRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    paymentType: PaymentType.MPESA,
                    reference: "ABC123",
                })
            );
        });

        it("marks expense SETTLED when full amount is paid", async () => {
            const expense = { id: 3, status: ExpenseStatus.OPEN, amount: 500, payments: [] };
            mockExpenseRepo.findOne
                .mockResolvedValueOnce(expense)
                .mockResolvedValueOnce({ ...expense, payments: [{ payment: { debitAmount: 500 } }] });

            mockPaymentRepo.save.mockResolvedValue({ id: 1 });
            mockExpensePaymentRepo.save.mockResolvedValue({});

            await service.recordPayment(3, { amount: 500 }, 1);

            expect(mockExpenseRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ status: ExpenseStatus.SETTLED })
            );
        });

        it("marks expense PARTIAL when partially paid", async () => {
            const expense = { id: 4, status: ExpenseStatus.OPEN, amount: 500, payments: [] };
            mockExpenseRepo.findOne
                .mockResolvedValueOnce(expense)
                .mockResolvedValueOnce({ ...expense, payments: [{ payment: { debitAmount: 200 } }] });

            mockPaymentRepo.save.mockResolvedValue({ id: 2 });
            mockExpensePaymentRepo.save.mockResolvedValue({});

            await service.recordPayment(4, { amount: 200 }, 1);

            expect(mockExpenseRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ status: ExpenseStatus.PARTIAL })
            );
        });
    });
});

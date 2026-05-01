import { DataSource } from "typeorm";
import { SupplierPayment, SupplierPaymentAction } from "@backend/entities/SupplierPayment";
import { Payment, PaymentType } from "@backend/entities/Payment";
import {
    SupplierTransaction,
    SupplierTransactionType,
    SupplierReferenceType,
} from "@backend/entities/SupplierTransaction";
import { Supplier } from "@backend/entities/Supplier";
import { cache } from "@backend/utils/cache";

export interface RecordSupplierPaymentInput {
    supplierId: number;
    paymentType: PaymentType;
    amount: number;
    action: SupplierPaymentAction;
    actionReferenceId?: number | null;
    notes: string;
    reference?: string | null;
}

export class SupplierPaymentService {
    constructor(private dataSource: DataSource) {}

    async recordPayment(
        input: RecordSupplierPaymentInput,
        userId: number,
    ): Promise<SupplierPayment> {
        const { supplierId, paymentType, amount, action, actionReferenceId, notes, reference } =
            input;

        if (!notes?.trim()) {
            throw new Error("Notes are required for supplier payments");
        }

        const amt = Math.round(Number(amount) * 100) / 100;
        if (!Number.isFinite(amt) || amt <= 0) {
            throw new Error("Amount must be a positive number");
        }

        const supplier = await this.dataSource
            .getRepository(Supplier)
            .findOne({ where: { id: supplierId } });
        if (!supplier) {
            throw new Error(`Supplier with id ${supplierId} not found`);
        }

        const isRefund = action === SupplierPaymentAction.REFUND;
        const creditAmount = isRefund ? 0 : amt;
        const debitAmount = isRefund ? amt : 0;
        const transactionType = isRefund
            ? SupplierTransactionType.REFUND
            : SupplierTransactionType.PAYMENT;

        const normalizedRef = reference ? reference.trim().toUpperCase() || null : null;

        const savedSp = await this.dataSource.transaction(async (manager) => {
            // 1. Central payment record
            const payment = await manager.getRepository(Payment).save(
                manager.getRepository(Payment).create({
                    paymentType,
                    creditAmount,
                    debitAmount,
                    reference: normalizedRef,
                    paidAt: new Date(),
                    created_by: userId,
                }),
            );

            // 2. Supplier payment context record
            const sp = await manager.getRepository(SupplierPayment).save(
                manager.getRepository(SupplierPayment).create({
                    supplier_id: supplierId,
                    payment_id: payment.id,
                    action,
                    action_reference_id: actionReferenceId ?? null,
                    notes: notes.trim(),
                    created_by: userId,
                }),
            );

            // 3. Ledger entry — reference_id points to supplier_payment for full trace
            await manager.getRepository(SupplierTransaction).save(
                manager.getRepository(SupplierTransaction).create({
                    supplier_id: supplierId,
                    transaction_type: transactionType,
                    debit_amount: debitAmount,
                    credit_amount: creditAmount,
                    reference_type: SupplierReferenceType.PAYMENT,
                    reference_id: sp.id,
                    notes: notes.trim(),
                    created_by: userId,
                }),
            );

            return sp;
        });

        cache.invalidate(`supplier_balance_${supplierId}`);
        cache.invalidate(`supplier_transactions_${supplierId}`);

        return savedSp;
    }

    async getPaymentsForReference(
        action: SupplierPaymentAction,
        actionReferenceId: number,
    ): Promise<SupplierPayment[]> {
        return this.dataSource
            .getRepository(SupplierPayment)
            .createQueryBuilder("sp")
            .leftJoinAndSelect("sp.payment", "payment")
            .where("sp.action = :action", { action })
            .andWhere("sp.action_reference_id = :refId", { refId: actionReferenceId })
            .orderBy("sp.created_at", "DESC")
            .getMany();
    }
}

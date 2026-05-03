import { Entity, Column, ManyToOne, JoinColumn, RelationId } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import type { Expense } from "./Expense";
import type { Payment } from "./Payment";

@Entity("expense_payment")
export class ExpensePayment extends BaseEntity {
    @ManyToOne("expense", (e: Expense) => e.payments)
    @JoinColumn({ name: "expense_id" })
    expense: Expense;

    @RelationId((ep: ExpensePayment) => ep.expense)
    expense_id: number;

    @ManyToOne("payment")
    @JoinColumn({ name: "payment_id" })
    payment: Payment;

    @RelationId((ep: ExpensePayment) => ep.payment)
    payment_id: number;

    @Column({ type: "text", nullable: true })
    notes: string | null;
}
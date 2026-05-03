import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import type { Expense } from "./Expense";
import type { Payment } from "./Payment";

@Entity("expense_payment")
export class ExpensePayment extends BaseEntity {
    @ManyToOne("expense", (e: Expense) => e.payments)
    @JoinColumn({ name: "expense_id" })
    expense: Expense;

    @Column({ name: "expense_id", type: "int" })
    expense_id: number;

    @ManyToOne("payment")
    @JoinColumn({ name: "payment_id" })
    payment: Payment;

    @Column({ name: "payment_id", type: "int" })
    payment_id: number;

    @Column({ type: "text", nullable: true })
    notes: string | null;
}
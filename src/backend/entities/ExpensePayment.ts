import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import type { Expense } from "./Expense";

@Entity("expense_payment")
export class ExpensePayment extends BaseEntity {
    @Column({ type: "int", name: "expense_id" })
    expense_id: number;

    @ManyToOne("expense", (e: Expense) => e.payments)
    @JoinColumn({ name: "expense_id" })
    expense: Expense;

    @Column({ type: "decimal", precision: 10, scale: 2 })
    amount: number;

    @Column({ type: "varchar", length: 50, name: "payment_method", default: "cash" })
    payment_method: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    reference: string | null;

    @Column({ type: "text", nullable: true })
    notes: string;
}

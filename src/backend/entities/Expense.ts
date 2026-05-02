import { Entity, Column, OneToMany, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import type { ExpensePayment } from "./ExpensePayment";
import { enumColType } from "./column-types";

export enum ExpenseStatus {
    OPEN = "open",
    PARTIAL = "partial",
    SETTLED = "settled",
}

@Entity("expense")
@Index(["expense_date"])
@Index(["status"])
export class Expense extends BaseEntity {
    @Column({ type: "varchar", length: 100 })
    category: string;

    @Column({ type: "text" })
    description: string;

    @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
    amount: number;

    @Column({ type: "datetime", name: "expense_date", default: () => "CURRENT_TIMESTAMP" })
    expense_date: Date;

    @Column({
        type: enumColType,
        enum: ExpenseStatus,
        default: ExpenseStatus.OPEN,
    })
    status: ExpenseStatus;

    @Column({ type: "text", nullable: true })
    notes: string;

    @OneToMany("expense_payment", (p: ExpensePayment) => p.expense)
    payments: ExpensePayment[];
}

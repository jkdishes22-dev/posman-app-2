import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { Bill } from "./Bill";
import { User } from "./User";

@Entity("credit_note")
export class CreditNote {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    bill_id: number;

    @ManyToOne(() => Bill)
    @JoinColumn({ name: "bill_id" })
    bill: Bill;

    @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
    credit_amount: number;

    @Column({ type: "text", nullable: true })
    reason: string;

    @Column({ type: "text", nullable: true })
    notes: string;

    @Column({ type: "enum", enum: ["pending", "processed", "cancelled"], default: "pending" })
    status: string;

    @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
    created_at: Date;

    @Column({ type: "datetime", nullable: true })
    processed_at: Date;

    @Column({ nullable: true })
    created_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "created_by" })
    createdBy: User;

    @Column({ nullable: true })
    processed_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "processed_by" })
    processedBy: User;
}

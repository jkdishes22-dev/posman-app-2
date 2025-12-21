import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { Bill } from "./Bill";
import { User } from "./User";
import { BaseEntity } from "./BaseEntity";

@Entity("credit_note")
export class CreditNote extends BaseEntity {
    @Column({ type: "int", nullable: true })
    bill_id: number;

    @ManyToOne(() => Bill)
    @JoinColumn({ name: "bill_id" })
    bill: Bill;

    @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
    credit_amount: number;

    @Column({ type: "varchar", length: 255, nullable: true })
    reason: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    notes: string;

    @Column({ type: "enum", enum: ["pending", "processed", "cancelled"], default: "pending" })
    status: string;

    @Column({ type: "datetime", nullable: true })
    processed_at: Date;

    @Column({ type: "int", nullable: true })
    processed_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "processed_by" })
    processedBy: User;
}

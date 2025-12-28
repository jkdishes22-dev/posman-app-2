import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { Item } from "./Item";
import { User } from "./User";

export enum ProductionPreparationStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    ISSUED = "issued",
}

@Entity("production_preparation")
@Index(["item_id"])
@Index(["status"])
@Index(["prepared_by"])
@Index(["prepared_at"])
export class ProductionPreparation extends BaseEntity {
    @Column({ type: "int", nullable: true, name: "item_id" })
    item_id: number;

    @ManyToOne(() => Item)
    @JoinColumn({ name: "item_id" })
    item: Item;

    @Column({ type: "int", name: "quantity_prepared" })
    quantity_prepared: number;

    @Column({
        type: "enum",
        enum: ProductionPreparationStatus,
        default: ProductionPreparationStatus.PENDING,
    })
    status: ProductionPreparationStatus;

    @Column({ type: "int", nullable: true, name: "prepared_by" })
    prepared_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "prepared_by" })
    prepared_by_user: User;

    @Column({ type: "datetime", nullable: true, name: "prepared_at" })
    prepared_at: Date | null;

    @Column({ type: "int", nullable: true, name: "issued_by" })
    issued_by: number | null;

    @ManyToOne(() => User)
    @JoinColumn({ name: "issued_by" })
    issued_by_user: User | null;

    @Column({ type: "datetime", nullable: true, name: "issued_at" })
    issued_at: Date | null;

    @Column({ type: "text", nullable: true })
    notes: string | null;

    @Column({ type: "text", nullable: true, name: "rejection_reason" })
    rejection_reason: string | null;
}


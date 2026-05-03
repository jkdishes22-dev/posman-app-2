import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { Item } from "./Item";
import { User } from "./User";
import { enumColType } from "./column-types";

export enum ProductionPreparationStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    ISSUED = "issued",
}

@Entity("production_preparation")
@Index(["status"])
@Index(["prepared_at"])
export class ProductionPreparation extends BaseEntity {
    @ManyToOne(() => Item)
    @JoinColumn({ name: "item_id" })
    item: Item;

    @Column({ name: "item_id", type: "int" })
    item_id: number;

    @Column({ type: "int", name: "quantity_prepared" })
    quantity_prepared: number;

    @Column({
        type: enumColType,
        enum: ProductionPreparationStatus,
        default: ProductionPreparationStatus.PENDING,
    })
    status: ProductionPreparationStatus;

    @ManyToOne(() => User)
    @JoinColumn({ name: "prepared_by" })
    prepared_by_user: User;

    @Column({ name: "prepared_by", type: "int" })
    prepared_by: number;

    @Column({ type: "datetime", nullable: true, name: "prepared_at" })
    prepared_at: Date | null;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "issued_by" })
    issued_by_user: User | null;

    @Column({ name: "issued_by", type: "int", nullable: true })
    issued_by: number | null;

    @Column({ type: "datetime", nullable: true, name: "issued_at" })
    issued_at: Date | null;

    @Column({ type: "text", nullable: true })
    notes: string | null;

    @Column({ type: "text", nullable: true, name: "rejection_reason" })
    rejection_reason: string | null;
}


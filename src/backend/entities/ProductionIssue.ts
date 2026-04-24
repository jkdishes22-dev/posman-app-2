import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { Item } from "./Item";
import { User } from "./User";
import { enumColType } from "./column-types";

export enum ProductionIssueStatus {
    DRAFT = "draft",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
}

@Entity("production_issue")
@Index(["item_id"])
@Index(["status"])
@Index(["issued_by"])
@Index(["issued_at"])
export class ProductionIssue extends BaseEntity {
    @Column({ type: "int", nullable: true, name: "item_id" })
    item_id: number;

    @ManyToOne(() => Item)
    @JoinColumn({ name: "item_id" })
    item: Item;

    @Column({ type: "int", name: "quantity_produced" })
    quantity_produced: number;

    @Column({
        type: enumColType,
        enum: ProductionIssueStatus,
        default: ProductionIssueStatus.DRAFT,
    })
    status: ProductionIssueStatus;

    @Column({ type: "int", nullable: true, name: "issued_by" })
    issued_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "issued_by" })
    issued_by_user: User;

    @Column({ type: "datetime", nullable: true, name: "issued_at" })
    issued_at: Date | null;

    @Column({ type: "text", nullable: true })
    notes: string;
}


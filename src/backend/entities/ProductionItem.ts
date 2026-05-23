import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { Item } from "./Item";
import { User } from "./User";
import { Production } from "./Production";
import { enumColType } from "./column-types";

export enum ProductionItemStatus {
    ISSUED = "issued",
    CANCELLED = "cancelled",
}

@Entity("production_item")
@Index(["production_id"])
@Index(["item_id"])
@Index(["issued_by"])
@Index(["issued_at"])
export class ProductionItem extends BaseEntity {
    @Column({ type: "int", nullable: true, name: "production_id" })
    production_id: number | null;

    @ManyToOne(() => Production, (p) => p.items, { nullable: true })
    @JoinColumn({ name: "production_id" })
    production: Production | null;

    @Column({ type: "int", name: "item_id" })
    item_id: number;

    @ManyToOne(() => Item)
    @JoinColumn({ name: "item_id" })
    item: Item;

    @Column({ type: "int", name: "quantity_produced" })
    quantity_produced: number;

    @Column({
        type: enumColType,
        enum: ProductionItemStatus,
        default: ProductionItemStatus.ISSUED,
    })
    status: ProductionItemStatus;

    @Column({ type: "int", nullable: true, name: "issued_by" })
    issued_by: number | null;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "issued_by" })
    issued_by_user: User | null;

    @Column({ type: "datetime", nullable: true, name: "issued_at" })
    issued_at: Date | null;

    @Column({ type: "text", nullable: true })
    notes: string | null;
}

import { Entity, Column, OneToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { Item } from "./Item";

@Entity("inventory")
@Index(["item_id"])
@Index(["quantity"])
export class Inventory extends BaseEntity {
    @Column({ type: "int", nullable: true, name: "item_id", unique: true })
    item_id: number;

    @OneToOne(() => Item)
    @JoinColumn({ name: "item_id" })
    item: Item;

    @Column({ type: "int", default: 0 })
    quantity: number;

    @Column({ type: "int", default: 0, name: "reserved_quantity" })
    reserved_quantity: number;

    @Column({ type: "int", nullable: true, name: "min_stock_level" })
    min_stock_level: number;

    @Column({ type: "int", nullable: true, name: "max_stock_level" })
    max_stock_level: number;

    @Column({ type: "int", nullable: true, name: "reorder_point" })
    reorder_point: number;

    @Column({ type: "datetime", nullable: true, name: "last_restocked_at" })
    last_restocked_at: Date;
}


import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import type { Relation } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { Item } from "./Item";

@Entity("purchase_item")
@Index(["item_id"], { unique: true })
export class PurchaseItem extends BaseEntity {
    @Column({ type: "int", nullable: false, name: "item_id" })
    item_id: number;

    @ManyToOne(() => Item)
    @JoinColumn({ name: "item_id" })
    item: Relation<Item>;

    /** Human-readable pack description, e.g. "Box of 300", "25 kg Bag", "Liter" */
    @Column({ type: "varchar", length: 100, name: "purchase_unit_label" })
    purchase_unit_label: string;

    /** Stock units added per purchased pack (e.g. 300 for "Box of 300", 1 for liquids) */
    @Column({ type: "decimal", precision: 10, scale: 4, name: "purchase_unit_qty" })
    purchase_unit_qty: number;

    /** Display label for lowest stock unit, e.g. "pieces", "kg", "liters" */
    @Column({ type: "varchar", length: 50, nullable: true, name: "unit_of_measure" })
    unit_of_measure: string | null;

    @Column({ type: "boolean", default: true, name: "is_active" })
    is_active: boolean;

    @Column({ type: "decimal", precision: 10, scale: 2, nullable: true, name: "default_purchase_price" })
    default_purchase_price: number | null;
}

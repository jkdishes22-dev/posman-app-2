import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import type { Relation } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { PurchaseOrder } from "./PurchaseOrder";
import { Item } from "./Item";

@Entity("purchase_order_item")
@Index(["purchase_order_id"])
@Index(["item_id"])
export class PurchaseOrderItem extends BaseEntity {
    @Column({ type: "int", nullable: true, name: "purchase_order_id" })
    purchase_order_id: number;

    @ManyToOne(() => PurchaseOrder, (po) => po.items)
    @JoinColumn({ name: "purchase_order_id" })
    purchase_order: Relation<PurchaseOrder>;

    @Column({ type: "int", nullable: true, name: "item_id" })
    item_id: number;

    @ManyToOne(() => Item)
    @JoinColumn({ name: "item_id" })
    item: Item;

    @Column({ type: "int", name: "quantity_ordered" })
    quantity_ordered: number;

    @Column({ type: "int", default: 0, name: "quantity_received" })
    quantity_received: number;

    @Column({ type: "decimal", precision: 10, scale: 2, name: "unit_price" })
    unit_price: number;

    @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
    subtotal: number;

    /** Snapshot of PurchaseItem.purchase_unit_label at PO creation time */
    @Column({ type: "varchar", length: 100, nullable: true, name: "pack_label" })
    pack_label: string | null;

    /** Snapshot of PurchaseItem.purchase_unit_qty; stock = quantity_received × pack_qty */
    @Column({ type: "decimal", precision: 10, scale: 4, default: 1, name: "pack_qty" })
    pack_qty: number;
}


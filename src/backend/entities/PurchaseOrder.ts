import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { Supplier } from "./Supplier";
import type { PurchaseOrderItem } from "./PurchaseOrderItem";

export enum PurchaseOrderStatus {
    DRAFT = "draft",
    SENT = "sent",
    PARTIAL = "partial",
    RECEIVED = "received",
    CANCELLED = "cancelled",
}

@Entity("purchase_order")
@Index(["status"])
@Index(["supplier_id"])
@Index(["order_number"], { unique: true })
export class PurchaseOrder extends BaseEntity {
    @Column({ type: "int", nullable: true, name: "supplier_id" })
    supplier_id: number;

    @ManyToOne(() => Supplier)
    @JoinColumn({ name: "supplier_id" })
    supplier: Supplier;

    @Column({ type: "varchar", length: 100, name: "order_number", unique: true })
    order_number: string;

    @Column({ type: "datetime", name: "order_date", default: () => "CURRENT_TIMESTAMP" })
    order_date: Date;

    @Column({ type: "datetime", nullable: true, name: "expected_delivery_date" })
    expected_delivery_date: Date;

    @Column({
        type: "enum",
        enum: PurchaseOrderStatus,
        default: PurchaseOrderStatus.DRAFT,
    })
    status: PurchaseOrderStatus;

    @Column({ type: "decimal", precision: 10, scale: 2, default: 0, name: "total_amount" })
    total_amount: number;

    @Column({ type: "text", nullable: true })
    notes: string;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    @OneToMany(() => require("./PurchaseOrderItem").PurchaseOrderItem, (poItem: any) => poItem.purchase_order)
    items: PurchaseOrderItem[];
}


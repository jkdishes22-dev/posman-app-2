import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { Item } from "./Item";

export enum InventoryTransactionType {
    SALE = "sale",
    PURCHASE = "purchase",
    ADJUSTMENT = "adjustment",
    TRANSFER = "transfer",
    RETURN = "return",
}

export enum InventoryReferenceType {
    BILL = "bill",
    PURCHASE_ORDER = "purchase_order",
    MANUAL_ADJUSTMENT = "manual_adjustment",
}

@Entity("inventory_transaction")
@Index(["item_id"])
@Index(["transaction_type"])
@Index(["reference_type"])
@Index(["created_at"])
export class InventoryTransaction extends BaseEntity {
    @Column({ type: "int", nullable: true, name: "item_id" })
    item_id: number;

    @ManyToOne(() => Item)
    @JoinColumn({ name: "item_id" })
    item: Item;

    @Column({
        type: "enum",
        enum: InventoryTransactionType,
        name: "transaction_type",
    })
    transaction_type: InventoryTransactionType;

    @Column({ type: "int" })
    quantity: number; // positive for additions, negative for deductions

    @Column({
        type: "enum",
        enum: InventoryReferenceType,
        nullable: true,
        name: "reference_type",
    })
    reference_type: InventoryReferenceType;

    @Column({ type: "int", nullable: true, name: "reference_id" })
    reference_id: number; // ID of bill, purchase_order, etc.

    @Column({ type: "text", nullable: true })
    notes: string;
}


import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { Supplier } from "./Supplier";
import { Payment } from "./Payment";
import { enumColType } from "./column-types";

export enum SupplierPaymentAction {
  PURCHASE_ORDER = "purchase_order",
  EXPENSE        = "expense",
  ADVANCE        = "advance",
  REFUND         = "refund",
}

@Entity("supplier_payment")
@Index(["supplier_id"])
@Index(["payment_id"])
@Index(["created_at"])
export class SupplierPayment extends BaseEntity {
  @Column({ type: "int", nullable: false, name: "supplier_id" })
  supplier_id: number;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: "supplier_id" })
  supplier: Supplier;

  @Column({ type: "int", nullable: false, name: "payment_id" })
  payment_id: number;

  @ManyToOne(() => Payment)
  @JoinColumn({ name: "payment_id" })
  payment: Payment;

  @Column({
    type: enumColType,
    enum: SupplierPaymentAction,
    nullable: false,
    name: "action",
  })
  action: SupplierPaymentAction;

  // Polymorphic reference: purchase_order.id, invoice.id, etc. — nullable for general payments
  @Column({ type: "int", nullable: true, name: "action_reference_id" })
  action_reference_id: number | null;

  @Column({ type: "text", nullable: false })
  notes: string;
}

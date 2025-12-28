import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { Supplier } from "./Supplier";
import { Payment, PaymentType } from "./Payment";

/**
 * SupplierPayment entity
 * 
 * Tracks payments made to suppliers (reduces debit_balance) or received from suppliers (increases credit_balance).
 * Similar to Payment entity but specifically for supplier transactions.
 */
@Entity("supplier_payment")
@Index(["supplier_id"])
@Index(["payment_id"])
@Index(["created_at"])
export class SupplierPayment extends BaseEntity {
  @Column({ type: "int", nullable: true, name: "supplier_id" })
  supplier_id: number;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: "supplier_id" })
  supplier: Supplier;

  @Column({ type: "int", nullable: true, name: "payment_id" })
  payment_id: number;

  @ManyToOne(() => Payment)
  @JoinColumn({ name: "payment_id" })
  payment: Payment;

  // Amount paid to supplier (reduces our debt/debit_balance)
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0, name: "amount_paid" })
  amount_paid: number;

  // Amount received from supplier (increases our credit/credit_balance)
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0, name: "amount_received" })
  amount_received: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  reference: string;

  @Column({ type: "text", nullable: true })
  notes: string;
}


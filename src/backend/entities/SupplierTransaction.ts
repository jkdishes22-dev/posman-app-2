import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { Supplier } from "./Supplier";
import { enumColType } from "./column-types";

export enum SupplierTransactionType {
  PURCHASE_ORDER = "purchase_order",      // We owe supplier (increases debit_balance)
  PAYMENT = "payment",                      // We pay supplier (decreases debit_balance)
  RETURN = "return",                        // Supplier owes us (increases credit_balance)
  REFUND = "refund",                       // Supplier pays us (decreases credit_balance)
  ADJUSTMENT = "adjustment",                // Manual adjustment
  CREDIT_NOTE = "credit_note",              // Credit note issued
}

export enum SupplierReferenceType {
  PURCHASE_ORDER = "purchase_order",
  PAYMENT = "payment",
  RETURN = "return",
  REFUND = "refund",
  ADJUSTMENT = "adjustment",
  CREDIT_NOTE = "credit_note",
}

/**
 * SupplierTransaction entity
 * 
 * Audit trail for all supplier financial transactions.
 * This is the source of truth for calculating credit_balance and debit_balance.
 * Similar to InventoryTransaction but for supplier finances.
 */
@Entity("supplier_transaction")
@Index(["supplier_id"])
@Index(["transaction_type"])
@Index(["reference_type"])
@Index(["created_at"])
export class SupplierTransaction extends BaseEntity {
  @Column({ type: "int", nullable: true, name: "supplier_id" })
  supplier_id: number;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: "supplier_id" })
  supplier: Supplier;

  @Column({
    type: enumColType,
    enum: SupplierTransactionType,
    name: "transaction_type",
  })
  transaction_type: SupplierTransactionType;

  // Amount that affects debit_balance (positive = we owe more, negative = we owe less)
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0, name: "debit_amount" })
  debit_amount: number;

  // Amount that affects credit_balance (positive = supplier owes us more, negative = supplier owes us less)
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0, name: "credit_amount" })
  credit_amount: number;

  @Column({
    type: enumColType,
    enum: SupplierReferenceType,
    nullable: true,
    name: "reference_type",
  })
  reference_type: SupplierReferenceType;

  @Column({ type: "int", nullable: true, name: "reference_id" })
  reference_id: number; // ID of purchase_order, supplier_payment, etc.

  @Column({ type: "text", nullable: true })
  notes: string;
}


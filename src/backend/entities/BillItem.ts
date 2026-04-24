import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import type { Relation } from "typeorm";
import { Item } from "./Item";
import { Bill, BillStatus } from "./Bill";
import { BaseEntity } from "./BaseEntity";
import { enumColType } from "./column-types";

export enum BillItemStatus {
  PENDING = "pending",
  SUBMITTED = "submitted",
  VOID_PENDING = "void_pending",
  VOIDED = "voided",
  CLOSED = "closed",
  QUANTITY_CHANGE_REQUEST = "quantity_change_request",
  DELETED = "deleted",
}

@Entity("bill_item")
@Index(["bill_id", "created_at"])
@Index(["item_id", "status"])
export class BillItem extends BaseEntity {
  @Column({ type: "int", nullable: true })
  item_id: number;

  @Column({ type: "int", nullable: true })
  bill_id: number;

  @ManyToOne(() => Item)
  @JoinColumn({ name: "item_id" })
  item: Item;

  @ManyToOne(() => Bill, (bill) => bill.bill_items)
  @JoinColumn({ name: "bill_id" })
  bill: Relation<Bill>;

  @Column({ type: "int", default: 0 })
  quantity: number;

  @Column({ type: "double", default: 0.0 })
  subtotal: number;

  @Column({
    type: enumColType,
    enum: BillItemStatus,
    default: BillItemStatus.PENDING,
  })
  status: BillItemStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  void_reason: string;

  @Column({ type: "int", nullable: true })
  void_requested_by: number;

  @Column({ type: "datetime", nullable: true })
  void_requested_at: Date;

  @Column({ type: "int", nullable: true })
  void_approved_by: number;

  @Column({ type: "datetime", nullable: true })
  void_approved_at: Date;

  // Quantity change tracking columns
  @Column({ type: "int", nullable: true })
  requested_quantity: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  quantity_change_reason: string;

  @Column({ type: "int", nullable: true })
  quantity_change_requested_by: number;

  @Column({ type: "datetime", nullable: true })
  quantity_change_requested_at: Date;

  @Column({ type: "int", nullable: true })
  quantity_change_approved_by: number;

  @Column({ type: "datetime", nullable: true })
  quantity_change_approved_at: Date;

  // Business rule validation methods (Rule 4.3)
  canVoid(bill: Bill): boolean {
    return (bill.status === BillStatus.PENDING || bill.status === BillStatus.REOPENED)
      && this.status === BillItemStatus.PENDING;
  }

  canApproveVoid(bill: Bill): boolean {
    return bill.status === BillStatus.PENDING
      && this.status === BillItemStatus.VOID_PENDING;
  }

  // State transition validation (Rule 4.7)
  canTransitionTo(newStatus: BillItemStatus): boolean {
    const transitions = {
      [BillItemStatus.PENDING]: [BillItemStatus.SUBMITTED, BillItemStatus.VOID_PENDING, BillItemStatus.QUANTITY_CHANGE_REQUEST],
      [BillItemStatus.SUBMITTED]: [BillItemStatus.CLOSED],
      [BillItemStatus.VOID_PENDING]: [BillItemStatus.VOIDED, BillItemStatus.PENDING], // approved or rejected
      [BillItemStatus.QUANTITY_CHANGE_REQUEST]: [BillItemStatus.PENDING], // approved or rejected
      [BillItemStatus.CLOSED]: [], // terminal state
      [BillItemStatus.VOIDED]: [], // terminal state
      [BillItemStatus.DELETED]: [] // terminal state
    };

    return transitions[this.status]?.includes(newStatus) || false;
  }
}

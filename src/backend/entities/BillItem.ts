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
import { Bill } from "./Bill";

export enum BillItemStatus {
  ACTIVE = "active",
  DELETED = "deleted",
  SUBMITTED = "submitted",
  VOIDED = "voided",
}

export enum ItemStatus {
  ACTIVE = "active",
  VOID_PENDING = "void_pending",
  VOIDED = "voided",
}

@Entity("bill_item")
@Index(["bill_id", "created_at"])
@Index(["item_id", "status"])
export class BillItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  item_id: number;

  @Column({ nullable: true })
  bill_id: number;

  @ManyToOne(() => Item)
  @JoinColumn({ name: "item_id" })
  item: Item;

  @ManyToOne(() => Bill, (bill) => bill.bill_items)
  @JoinColumn({ name: "bill_id" })
  bill: Relation<Bill>;

  @Column({ default: 0 })
  quantity: number;

  @Column({ type: "double", default: 0.0 })
  subtotal: number;

  @Column({
    type: "enum",
    enum: BillItemStatus,
    nullable: true,
  })
  status: BillItemStatus;

  // Voiding tracking columns (Rule 4.1)
  @Column({
    type: "enum",
    enum: ItemStatus,
    default: ItemStatus.ACTIVE,
  })
  status: ItemStatus;

  @Column({ type: "text", nullable: true })
  void_reason: string;

  @Column({ nullable: true })
  void_requested_by: number;

  @Column({ type: "datetime", nullable: true })
  void_requested_at: Date;

  @Column({ nullable: true })
  void_approved_by: number;

  @Column({ type: "datetime", nullable: true })
  void_approved_at: Date;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @Column({ type: "datetime", nullable: true })
  updated_at: Date;

  // Business rule validation methods (Rule 4.3)
  canVoid(bill: Bill): boolean {
    return (bill.status === 'submitted' || bill.status === 'reopened')
      && this.status === ItemStatus.ACTIVE;
  }

  canApproveVoid(bill: Bill): boolean {
    return bill.status === 'submitted'
      && this.status === ItemStatus.VOID_PENDING;
  }

  // State transition validation (Rule 4.7)
  canTransitionTo(newStatus: ItemStatus): boolean {
    const transitions = {
      [ItemStatus.ACTIVE]: [ItemStatus.VOID_PENDING],
      [ItemStatus.VOID_PENDING]: [ItemStatus.VOIDED, ItemStatus.ACTIVE], // approved or rejected
      [ItemStatus.VOIDED]: [] // terminal state
    };

    return transitions[this.status]?.includes(newStatus) || false;
  }
}

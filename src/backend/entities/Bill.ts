import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  JoinColumn,
  ManyToOne,
  Index,
} from "typeorm";
import { User } from "./User";
import { BillItem } from "./BillItem";
import { BillPayment } from "./BillPayment";
import { Station } from "./Station";

export enum BillStatus {
  PENDING = "pending",
  CANCELLED = "cancelled",
  SUBMITTED = "submitted",
  CLOSED = "closed",
  VOIDED = "voided",
  REOPENED = "reopened",
}

@Entity("bill")
@Index(["user_id", "created_at"])
@Index(["status", "created_at"])
@Index(["station_id", "created_at"])
export class Bill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  user_id: number;

  // @ManyToOne(() => User, (user) => user.bills)
  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({
    type: "enum",
    enum: BillStatus,
    nullable: true,
  })
  status: BillStatus;

  @Column({ nullable: true })
  total: number;

  @Column({ nullable: true })
  cleared_by: number;

  @Column({ type: "datetime", nullable: true })
  cleared_at: Date;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @Column({ type: "datetime", nullable: true })
  updated_at: Date;

  @Column({ nullable: true })
  created_by: number;

  @Column({ nullable: true })
  updated_by: number;

  @Column({ nullable: true })
  station_id: number;

  @ManyToOne(() => Station, { nullable: true })
  @JoinColumn({ name: "station_id" })
  station: Station;

  // Reopening tracking columns (Rule 4.1)
  @Column({ type: "text", nullable: true })
  reopen_reason: string;

  @Column({ nullable: true })
  reopened_by: number;

  @Column({ type: "datetime", nullable: true })
  reopened_at: Date;

  @Column({ type: "text", nullable: true })
  notes: string;

  @OneToMany(() => BillItem, (billItem) => billItem.bill, { eager: true })
  bill_items: BillItem[];

  @OneToMany(() => BillPayment, (billPayment) => billPayment.bill)
  bill_payments: BillPayment[];

  // Bill status calculation method (Rule 4.7)
  calculateBillStatus(): BillStatus {
    const items = this.bill_items || [];
    const activeItems = items.filter(item => item.item_status === 'active');
    const voidedItems = items.filter(item => item.item_status === 'voided');

    // If all items are voided, bill is voided
    if (voidedItems.length === items.length && items.length > 0) {
      return BillStatus.VOIDED;
    }

    // If some items are voided, bill is still submitted (partially voided but still closable)
    if (voidedItems.length > 0) {
      return BillStatus.SUBMITTED;
    }

    // Normal flow - return current status
    return this.status;
  }

  // Business rule validation methods (Rule 4.3, 4.4)
  canReopen(): boolean {
    return this.status === BillStatus.SUBMITTED;
  }

  canResubmit(): boolean {
    return this.status === BillStatus.REOPENED;
  }
}

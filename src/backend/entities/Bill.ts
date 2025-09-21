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
  SUBMITTED = "submitted",
  CLOSED = "closed",
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

  @Column({ nullable: true, unique: true })
  request_id: string;

  @Column({ nullable: true })
  updated_by: number;

  @Column({ nullable: true })
  station_id: number;

  @ManyToOne(() => Station, { nullable: true })
  @JoinColumn({ name: "station_id" })
  station: Station;

  @OneToMany(() => BillItem, (billItem) => billItem.bill, { eager: true })
  bill_items: BillItem[];

  @OneToMany(() => BillPayment, (billPayment) => billPayment.bill)
  bill_payments: BillPayment[];

  // Reopening tracking columns (Rule 4.1)
  @Column({ type: "text", nullable: true })
  reopen_reason: string;

  @Column({ nullable: true })
  reopened_by: number;

  @Column({ type: "datetime", nullable: true })
  reopened_at: Date;

  @Column({ type: "text", nullable: true })
  notes: string;

  // Business rule validation methods (Rule 4.3, 4.4)
  canReopen(): boolean {
    return this.status === BillStatus.SUBMITTED;
  }

  canResubmit(): boolean {
    return this.status === BillStatus.REOPENED;
  }
}

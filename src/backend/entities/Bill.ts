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
import type { BillItem } from "./BillItem";
import type { BillPayment } from "./BillPayment";
import { Station } from "./Station";
import { BaseEntity } from "./BaseEntity";

export enum BillStatus {
  PENDING = "pending",
  SUBMITTED = "submitted",
  CLOSED = "closed",
  REOPENED = "reopened",
  CANCELLED = "cancelled",
  VOIDED = "voided",
}

@Entity("bill")
@Index(["user_id", "created_at"])
@Index(["status", "created_at"])
@Index(["station_id", "created_at"])
export class Bill extends BaseEntity {
  @Column({ type: "int", nullable: true })
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

  @Column({ type: "double", nullable: true })
  total: number;

  @Column({ type: "int", nullable: true })
  cleared_by: number;

  @Column({ type: "datetime", nullable: true })
  cleared_at: Date;

  @Column({ type: "varchar", length: 255, nullable: true, unique: true })
  request_id: string;

  @Column({ type: "int", nullable: true })
  station_id: number;

  @ManyToOne(() => Station)
  @JoinColumn({ name: "station_id" })
  station: Station;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  @OneToMany(() => require("./BillItem").BillItem, (billItem: any) => billItem.bill, { eager: true })
  bill_items: BillItem[];

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  @OneToMany(() => require("./BillPayment").BillPayment, (billPayment: any) => billPayment.bill)
  bill_payments: BillPayment[];

  // Reopening tracking columns (Rule 4.1)
  @Column({ type: "varchar", length: 255, nullable: true })
  reopen_reason: string;

  @Column({ type: "int", nullable: true })
  reopened_by: number;

  @Column({ type: "datetime", nullable: true })
  reopened_at: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  notes: string;

  // Business rule validation methods (Rule 4.3, 4.4)
  canReopen(): boolean {
    return this.status === BillStatus.SUBMITTED;
  }

  canResubmit(): boolean {
    return this.status === BillStatus.REOPENED;
  }
}

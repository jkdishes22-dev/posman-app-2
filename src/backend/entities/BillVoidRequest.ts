import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Bill } from "./Bill";
import { User } from "./User";
import { BaseEntity } from "./BaseEntity";
import { enumColType } from "./column-types";

export enum VoidRequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

@Entity("bill_void_request")
@Index(["bill_id", "status"])
@Index(["approved_by", "approved_at"])
export class BillVoidRequest extends BaseEntity {
  @Column({ type: "int", nullable: false })
  bill_id: number;

  @ManyToOne(() => Bill)
  @JoinColumn({ name: "bill_id" })
  bill: Bill;

  @Column({ type: "int", nullable: false })
  initiated_by: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "initiated_by" })
  initiator: User;

  @Column({ nullable: true })
  approved_by!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "approved_by" })
  approver: User;

  @Column({
    type: enumColType,
    enum: VoidRequestStatus,
    default: VoidRequestStatus.PENDING,
  })
  status: VoidRequestStatus;

  @Column({ type: "text", nullable: true })
  reason: string;

  @Column({ type: "text", nullable: true })
  approval_notes: string;

  @Column({ type: "datetime", nullable: true })
  approved_at: Date;

  // Paper approval tracking
  @Column({ type: "boolean", default: false })
  paper_approval_received: boolean;

  @Column({ type: "datetime", nullable: true })
  paper_approval_date: Date;

  @Column({ type: "text", nullable: true })
  paper_approval_notes: string;
}

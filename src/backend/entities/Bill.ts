import { Entity, PrimaryGeneratedColumn, Column, OneToMany, JoinColumn, ManyToOne } from "typeorm";
import { User } from "@entities/User";
import { BillItem } from "@entities/BillItem";
import { BillPayment } from "./BillPayment";


export enum BillStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  SUBMITTED = "submitted",
}

@Entity()
export class Bill {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.bills)
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

  @OneToMany(() => BillItem, (billItem) => billItem.bill, { eager: true})
  bill_items: BillItem[];

  @OneToMany(() => BillPayment, (billPayment) => billPayment.bill)
  bill_payments: BillPayment[];
}

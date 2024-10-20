import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { BillItem } from "@entities/BillItem";

export enum BillStatus {
  SUBMITTED = "submitted",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

@Entity("bill")
export class Bill {
  @PrimaryGeneratedColumn("increment", { unsigned: true })
  id: number;

  @Column()
  bill_code: string;

  @Column()
  user_id: number;

  @Column({ type: "enum", enum: BillStatus, default: BillStatus.SUBMITTED })
  status: BillStatus;

  @Column() total: number;

  @Column() cleared_by: number;

  @Column()
  cleared_at: Date;

  @CreateDateColumn({ type: "datetime" })
  created_at: Date;

  @UpdateDateColumn({ type: "datetime" })
  updated_at: Date;

  @Column() created_by: number;

  @Column() updated_by: number;

  @OneToMany(() => BillItem, (billItem) => billItem.bill, { cascade: true })
  bill_items: BillItem[];
}

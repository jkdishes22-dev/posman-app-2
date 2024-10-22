import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from "typeorm";
import { BillItem } from "@entities/BillItem";


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

  @Column()
  user_id: number;

  @Column({
    type: "enum",
    enum: BillStatus,
    nullable: true
  })
  status: BillStatus;

  @Column({ nullable: true })
  total: number;

  @Column({ nullable: true })
  cleared_by: number;

  @Column({ type: 'datetime', nullable: true })
  cleared_at: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'datetime', nullable: true })
  updated_at: Date;

  @Column({ nullable: true })
  created_by: number;

  @Column({ nullable: true })
  updated_by: number;

  @OneToMany(() => BillItem, (billItem) => billItem.bill)
  bill_items: BillItem[];
}

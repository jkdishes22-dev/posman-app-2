import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Item } from "@entities/Item";
import { Bill } from "@entities/Bill";

export enum BillItemStatus {
  ACTIVE = "active",
  DELETED = "deleted",
  SUBMITTED = "submitted",
  VOIDED = "voided",
}

@Entity()
export class BillItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Item)
  @JoinColumn({ name: "item_id" })
  item: Item;

  @ManyToOne(() => Bill, (bill) => bill.billItems)
  @JoinColumn({ name: "bill_id" })
  bill: Bill;

  @Column({ default: 0 })
  quantity: number;

  @Column({ type: 'double', default: 0.00 })
  subtotal: number;

  @Column({
    type: "enum",
    enum: BillItemStatus,
    nullable: true
  })
  status: BillItemStatus;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'datetime', nullable: true })
  updated_at: Date;
}

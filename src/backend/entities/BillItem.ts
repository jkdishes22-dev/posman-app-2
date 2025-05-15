import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import type { Relation } from "typeorm";
import { Item } from "@entities/Item";
import { Bill } from "@entities/Bill";

export enum BillItemStatus {
  ACTIVE = "active",
  DELETED = "deleted",
  SUBMITTED = "submitted",
  VOIDED = "voided",
}

@Entity("bill_item")
export class BillItem {
  @PrimaryGeneratedColumn()
  id: number;

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

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @Column({ type: "datetime", nullable: true })
  updated_at: Date;
}

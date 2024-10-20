import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn
} from "typeorm";
import { Bill } from "@entities/Bill";

export enum BillItemStatus {
  SUBMITTED = "submitted",
  VOID_REQUESTED = "void_requested",
  VOIDED = "voided",
  COMPLETED = "completed",
}

@Entity("bill_item")
export class BillItem {
  @PrimaryGeneratedColumn("increment", { unsigned: true })
  id: number;

  @Column()
  item_id: number;

  @Column()
  bill_id: number;

  @Column()
  quantity: number;

  @Column()
  subtotal: number;

  @Column({
    type: "enum",
    enum: BillItemStatus,
    default: BillItemStatus.SUBMITTED,
  })
  status: BillItemStatus;

  @ManyToOne(() => Bill, (bill) => bill.bill_items)
  @JoinColumn({ name: "bill_id" })
  bill: Bill;
}

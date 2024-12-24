import { Entity, ManyToOne, Column, JoinColumn } from "typeorm";
import type { Relation } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { Bill } from "@entities/Bill";
import { Payment } from "@entities/Payment";

@Entity() 
export class BillPayment extends BaseEntity {
    @ManyToOne(() => Bill, (bill) => bill.bill_payments)
    @JoinColumn({ name: "bill_id" })
    bill: Relation<Bill>;

    @ManyToOne(() => Payment)
    @JoinColumn({ name: 'payment_id' })
    payment: Payment;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  updated_at: Date;

  @Column({ nullable: false })
  created_by: number;

  @Column({ nullable: true })
  updated_by: number;
}

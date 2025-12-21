import { Entity, ManyToOne, Column, JoinColumn } from "typeorm";
import type { Relation } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { Bill } from "./Bill";
import { Payment } from "./Payment";

@Entity("bill_payment")
export class BillPayment extends BaseEntity {
  @ManyToOne(() => Bill, (bill) => bill.bill_payments)
  @JoinColumn({ name: "bill_id" })
  bill: Relation<Bill>;

  @ManyToOne(() => Payment)
  @JoinColumn({ name: "payment_id" })
  payment: Payment;
}

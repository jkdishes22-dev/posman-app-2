import { Entity, ManyToOne, Column, JoinColumn, Index } from "typeorm";
import type { Relation } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { Bill } from "./Bill";
import { Payment } from "./Payment";

@Entity("bill_payment")
export class BillPayment extends BaseEntity {
  // perf: index FK — queried when loading payments for a bill
  @Index()
  @ManyToOne(() => Bill, (bill) => bill.bill_payments)
  @JoinColumn({ name: "bill_id" })
  bill: Relation<Bill>;

  // perf: index FK — joined when resolving payment details
  @Index()
  @ManyToOne(() => Payment)
  @JoinColumn({ name: "payment_id" })
  payment: Payment;
}

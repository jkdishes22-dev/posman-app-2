import { Entity, Column, OneToMany } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { BillPayment } from "./BillPayment";

export enum PaymentType {
  CASH = "CASH",
  MPESA = "MPESA",
}

@Entity("payment")
export class Payment extends BaseEntity {
  @Column({ type: "double", default: 0.0, name: "debit_amount" })
  debitAmount: number;

  @Column({ type: "double", default: 0.0, name: "credit_amount" })
  creditAmount: number;

  @Column({
    type: "enum",
    enum: PaymentType,
    nullable: false,
    name: "payment_type",
  })
  paymentType: PaymentType;

  @Column({
    type: "datetime",
    nullable: false,
    default: () => "CURRENT_TIMESTAMP",
    name: "paid_at",
  })
  paidAt: Date;

  @Column()
  reference: string;

  @Column({
    type: "datetime",
    nullable: false,
    default: () => "CURRENT_TIMESTAMP",
  })
  created_at: Date;

  @Column({
    type: "datetime",
    nullable: false,
    default: () => "CURRENT_TIMESTAMP",
  })
  updated_at: Date;

  @Column({ nullable: false })
  created_by: number;

  @Column({ nullable: true })
  updated_by: number;

  @OneToMany(() => BillPayment, (billPayment) => billPayment.bill)
  bill_payments: Promise<BillPayment[]>;
}

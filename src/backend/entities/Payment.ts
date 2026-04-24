import { Entity, Column, OneToMany } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import type { BillPayment } from "./BillPayment";
import { EntityRef } from "./entity-refs";
import { enumColType } from "./column-types";

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
    type: enumColType,
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

  @Column({ type: "varchar", length: 255, nullable: true })
  reference: string | null;

  @OneToMany(() => EntityRef.get("BillPayment"), (billPayment: any) => billPayment.payment)
  bill_payments: Promise<BillPayment[]>;
}

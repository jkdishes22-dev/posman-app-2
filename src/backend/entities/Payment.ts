import { Entity, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { BillPayment } from "./BillPayment";

@Entity()
export class Payment extends BaseEntity{
    @Column({ type: 'int', nullable: true })
    debitAmount: number | null;

    @Column({ type: 'int', nullable: true })
    creditAmount: number | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    paymentType: string | null;

    @Column({ type: 'int', nullable: true })
    paidAt: number | null;

    @Column({ type: 'varchar', length: 250, nullable: true })
    reference: string | null;

    @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
    created_at: Date;
  
    @Column({ type: "datetime", nullable: true })
    updated_at: Date;
  
    @Column({ nullable: true })
    created_by: number;
  
    @Column({ nullable: true })
    updated_by: number;

    @OneToMany(() => BillPayment, billPayment => billPayment.payment)
    billPayments: BillPayment[];
}

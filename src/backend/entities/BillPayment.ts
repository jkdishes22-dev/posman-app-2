import { Entity, ManyToOne, CreateDateColumn, UpdateDateColumn, Column, JoinColumn } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { Bill } from "./Bill";
import { Payment } from "./Payment";

@Entity() export class BillPayment extends BaseEntity {

    @ManyToOne(() => Bill)
    @JoinColumn({ name: 'bill_id' })
    bill: Bill;

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


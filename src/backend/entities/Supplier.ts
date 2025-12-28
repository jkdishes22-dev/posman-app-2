import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity";

export enum SupplierStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
}

@Entity("supplier")
@Index(["status"])
@Index(["name"])
export class Supplier extends BaseEntity {
    @Column({ type: "varchar", length: 255 })
    name: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    contact_person: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    email: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    phone: string;

    @Column({ type: "text", nullable: true })
    address: string;

    // Maximum amount we can owe the supplier (credit limit)
    @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
    credit_limit: number;

    @Column({ type: "varchar", length: 255, nullable: true })
    payment_terms: string;

    // Note: credit_balance and debit_balance are calculated from SupplierTransaction
    // They are NOT stored in this table to maintain data integrity and normalization
    // Use SupplierService.getSupplierBalance() to get current balances

    @Column({
        type: "enum",
        enum: SupplierStatus,
        default: SupplierStatus.ACTIVE,
    })
    status: SupplierStatus;
}


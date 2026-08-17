import { Entity, Column, OneToMany, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { ProductionItem } from "./ProductionItem";
import { enumColType } from "./column-types";

export enum ProductionStatus {
    OPEN = "open",
    CLOSED = "closed",
}

@Entity("production")
@Index(["status"])
@Index(["created_at"])
export class Production extends BaseEntity {
    @Column({ type: "varchar", length: 255, unique: true })
    name: string;

    @Column({ type: "text", nullable: true })
    description: string | null;

    @Column({
        type: enumColType,
        enum: ProductionStatus,
        default: ProductionStatus.OPEN,
    })
    status: ProductionStatus;

    @Column({ type: "datetime", nullable: true, name: "deleted_at" })
    deleted_at: Date | null;

    @OneToMany(() => ProductionItem, (item) => item.production)
    items: ProductionItem[];
}

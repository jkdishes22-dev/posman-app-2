import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from "typeorm";
import { BaseEntity } from "./BaseEntity";

@Entity("reopen_reasons")
export class ReopenReason extends BaseEntity {
    @Column({ type: "varchar", length: 100, unique: true })
    reason_key: string;

    @Column({ type: "varchar", length: 255 })
    name: string;

    @Column({ type: "text", nullable: true })
    description: string;

    @Column({ type: "boolean", default: true })
    is_active: boolean;

    @Column({ type: "int", default: 0 })
    sort_order: number;
}

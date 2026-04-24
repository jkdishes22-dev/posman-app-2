import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";
import { User } from "./User";
import { BaseEntity } from "./BaseEntity";
import { enumColType, jsonColType } from "./column-types";

export enum NotificationType {
    BILL_REOPENED = "bill_reopened",
    BILL_RESUBMITTED = "bill_resubmitted",
    VOID_REQUEST = "void_request",
    VOID_APPROVED = "void_approved",
    VOID_REJECTED = "void_rejected"
}

export enum NotificationStatus {
    UNREAD = "unread",
    READ = "read",
    ARCHIVED = "archived"
}

@Entity("notifications")
export class Notification extends BaseEntity {
    @Column({ type: "varchar", length: 100 })
    type: NotificationType;

    @Column({ type: "varchar", length: 255 })
    title: string;

    @Column({ type: "varchar", length: 255 })
    message: string;

    @Column({ type: jsonColType, nullable: true })
    data: Record<string, any>;

    // perf: index (user_id, status) — filters unread notifications per user
    @Index(["user_id", "status"])
    @Column({ type: enumColType, enum: NotificationStatus, default: NotificationStatus.UNREAD })
    status: NotificationStatus;

    // perf: index FK — queried on every getUserNotifications call
    @Index()
    @Column({ type: "int" })
    user_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "user_id" })
    user: User;
}

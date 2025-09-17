import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";

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
export class Notification {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "varchar", length: 100 })
    type: NotificationType;

    @Column({ type: "varchar", length: 255 })
    title: string;

    @Column({ type: "text" })
    message: string;

    @Column({ type: "json", nullable: true })
    data: any;

    @Column({ type: "enum", enum: NotificationStatus, default: NotificationStatus.UNREAD })
    status: NotificationStatus;

    @Column({ type: "int" })
    user_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "user_id" })
    user: User;

    @Column({ type: "int", nullable: true })
    created_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "created_by" })
    createdBy: User;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}

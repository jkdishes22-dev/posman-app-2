import { Repository } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { Notification, NotificationType, NotificationStatus } from "../entities/Notification";
import { User } from "../entities/User";

export class NotificationService {
    private notificationRepository: Repository<Notification>;
    private userRepository: Repository<User>;

    constructor() {
        this.notificationRepository = AppDataSource.getRepository(Notification);
        this.userRepository = AppDataSource.getRepository(User);
    }

    /**
     * Create a new notification
     */
    async createNotification(
        type: NotificationType,
        title: string,
        message: string,
        userId: number,
        createdBy?: number,
        data?: any
    ): Promise<Notification> {
        const notification = this.notificationRepository.create({
            type,
            title,
            message,
            user_id: userId,
            created_by: createdBy,
            data,
            status: NotificationStatus.UNREAD
        });

        return await this.notificationRepository.save(notification);
    }

    /**
     * Get notifications for a user
     */
    async getUserNotifications(
        userId: number,
        status?: NotificationStatus,
        limit: number = 50,
        offset: number = 0
    ): Promise<Notification[]> {
        const query = this.notificationRepository
            .createQueryBuilder("notification")
            .leftJoinAndSelect("notification.user", "user")
            .where("notification.user_id = :userId", { userId })
            .orderBy("notification.created_at", "DESC")
            .limit(limit)
            .offset(offset);

        if (status) {
            query.andWhere("notification.status = :status", { status });
        }

        return await query.getMany();
    }

    /**
     * Get unread notification count for a user
     */
    async getUnreadCount(userId: number): Promise<number> {
        return await this.notificationRepository.count({
            where: {
                user_id: userId,
                status: NotificationStatus.UNREAD
            }
        });
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: number, userId: number): Promise<Notification | null> {
        const notification = await this.notificationRepository.findOne({
            where: { id: notificationId, user_id: userId }
        });

        if (!notification) {
            return null;
        }

        notification.status = NotificationStatus.READ;
        return await this.notificationRepository.save(notification);
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: number): Promise<void> {
        await this.notificationRepository.update(
            { user_id: userId, status: NotificationStatus.UNREAD },
            { status: NotificationStatus.READ }
        );
    }

    /**
     * Archive notification
     */
    async archiveNotification(notificationId: number, userId: number): Promise<Notification | null> {
        const notification = await this.notificationRepository.findOne({
            where: { id: notificationId, user_id: userId }
        });

        if (!notification) {
            return null;
        }

        notification.status = NotificationStatus.ARCHIVED;
        return await this.notificationRepository.save(notification);
    }

    /**
     * Create bill reopened notification
     */
    async createBillReopenedNotification(
        billId: number,
        salesUserId: number,
        reopenedBy: number,
        reason: string
    ): Promise<Notification> {
        const reopenedByUser = await this.userRepository.findOne({
            where: { id: reopenedBy }
        });

        const title = "Bill Reopened";
        const message = `Bill #${billId} has been reopened by ${reopenedByUser?.firstName} ${reopenedByUser?.lastName}. Reason: ${reason}`;

        return await this.createNotification(
            NotificationType.BILL_REOPENED,
            title,
            message,
            salesUserId,
            reopenedBy,
            { billId, reason }
        );
    }

    /**
     * Create bill resubmitted notification
     */
    async createBillResubmittedNotification(
        billId: number,
        cashierUserId: number,
        resubmittedBy: number,
        notes?: string
    ): Promise<Notification> {
        const resubmittedByUser = await this.userRepository.findOne({
            where: { id: resubmittedBy }
        });

        const title = "Bill Resubmitted";
        const message = `Bill #${billId} has been resubmitted by ${resubmittedByUser?.firstName} ${resubmittedByUser?.lastName}${notes ? `. Notes: ${notes}` : ""}`;

        return await this.createNotification(
            NotificationType.BILL_RESUBMITTED,
            title,
            message,
            cashierUserId,
            resubmittedBy,
            { billId, notes }
        );
    }

    /**
     * Create void request notification
     */
    async createVoidRequestNotification(
        billId: number,
        itemId: number,
        cashierUserId: number,
        requestedBy: number,
        reason: string
    ): Promise<Notification> {
        const requestedByUser = await this.userRepository.findOne({
            where: { id: requestedBy }
        });

        const title = "Void Request";
        const message = `Void request for Bill #${billId}, Item #${itemId} by ${requestedByUser?.firstName} ${requestedByUser?.lastName}. Reason: ${reason}`;

        return await this.createNotification(
            NotificationType.VOID_REQUEST,
            title,
            message,
            cashierUserId,
            requestedBy,
            { billId, itemId, reason }
        );
    }

    /**
     * Create void approved notification
     */
    async createVoidApprovedNotification(
        billId: number,
        itemId: number,
        salesUserId: number,
        approvedBy: number
    ): Promise<Notification> {
        const approvedByUser = await this.userRepository.findOne({
            where: { id: approvedBy }
        });

        const title = "Void Request Approved";
        const message = `Void request for Bill #${billId}, Item #${itemId} has been approved by ${approvedByUser?.firstName} ${approvedByUser?.lastName}`;

        return await this.createNotification(
            NotificationType.VOID_APPROVED,
            title,
            message,
            salesUserId,
            approvedBy,
            { billId, itemId }
        );
    }

    /**
     * Create void rejected notification
     */
    async createVoidRejectedNotification(
        billId: number,
        itemId: number,
        salesUserId: number,
        rejectedBy: number,
        reason: string
    ): Promise<Notification> {
        const rejectedByUser = await this.userRepository.findOne({
            where: { id: rejectedBy }
        });

        const title = "Void Request Rejected";
        const message = `Void request for Bill #${billId}, Item #${itemId} has been rejected by ${rejectedByUser?.firstName} ${rejectedByUser?.lastName}. Reason: ${reason}`;

        return await this.createNotification(
            NotificationType.VOID_REJECTED,
            title,
            message,
            salesUserId,
            rejectedBy,
            { billId, itemId, reason }
        );
    }
}

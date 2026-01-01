import { NextApiRequest, NextApiResponse } from "next";
import { NotificationService } from "../service/NotificationService";
import { NotificationStatus } from "../entities/Notification";
import { handleApiError } from "@backend/utils/errorHandler";

export class NotificationController {
    private static notificationService = new NotificationService();

    /**
     * Get user notifications
     */
    static async getUserNotifications(req: NextApiRequest, res: NextApiResponse) {
        try {
            const userId = parseInt(req.query.userId as string);
            const status = req.query.status as NotificationStatus;
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;

            if (!userId) {
                return res.status(400).json({ error: "User ID is required" });
            }

            const notifications = await NotificationController.notificationService.getUserNotifications(
                userId,
                status,
                limit,
                offset
            );

            res.status(200).json({ notifications });
        } catch (error: any) {
            const { userMessage, errorCode } = handleApiError(error, {
                operation: "fetching",
                resource: "notifications"
            });
            res.status(500).json({ error: userMessage, code: errorCode });
        }
    }

    /**
     * Get unread notification count
     */
    static async getUnreadCount(req: NextApiRequest, res: NextApiResponse) {
        try {
            const userId = parseInt(req.query.userId as string);

            if (!userId) {
                return res.status(400).json({ error: "User ID is required" });
            }

            const count = await NotificationController.notificationService.getUnreadCount(userId);

            res.status(200).json({ count });
        } catch (error: any) {
            const { userMessage, errorCode } = handleApiError(error, {
                operation: "fetching",
                resource: "notifications"
            });
            res.status(500).json({ error: userMessage, code: errorCode });
        }
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(req: NextApiRequest, res: NextApiResponse) {
        try {
            const { notificationId, userId } = req.body;

            if (!notificationId || !userId) {
                return res.status(400).json({ error: "Notification ID and User ID are required" });
            }

            const notification = await NotificationController.notificationService.markAsRead(
                notificationId,
                userId
            );

            if (!notification) {
                return res.status(404).json({ error: "Notification not found" });
            }

            res.status(200).json({ notification });
        } catch (error: any) {
            const { userMessage, errorCode } = handleApiError(error, {
                operation: "fetching",
                resource: "notifications"
            });
            res.status(500).json({ error: userMessage, code: errorCode });
        }
    }

    /**
     * Mark all notifications as read
     */
    static async markAllAsRead(req: NextApiRequest, res: NextApiResponse) {
        try {
            const { userId } = req.body;

            if (!userId) {
                return res.status(400).json({ error: "User ID is required" });
            }

            await NotificationController.notificationService.markAllAsRead(userId);

            res.status(200).json({ message: "All notifications marked as read" });
        } catch (error: any) {
            const { userMessage, errorCode } = handleApiError(error, {
                operation: "fetching",
                resource: "notifications"
            });
            res.status(500).json({ error: userMessage, code: errorCode });
        }
    }

    /**
     * Archive notification
     */
    static async archiveNotification(req: NextApiRequest, res: NextApiResponse) {
        try {
            const { notificationId, userId } = req.body;

            if (!notificationId || !userId) {
                return res.status(400).json({ error: "Notification ID and User ID are required" });
            }

            const notification = await NotificationController.notificationService.archiveNotification(
                notificationId,
                userId
            );

            if (!notification) {
                return res.status(404).json({ error: "Notification not found" });
            }

            res.status(200).json({ notification });
        } catch (error: any) {
            const { userMessage, errorCode } = handleApiError(error, {
                operation: "fetching",
                resource: "notifications"
            });
            res.status(500).json({ error: userMessage, code: errorCode });
        }
    }
}

// Export individual functions for API routes
export const getUserNotifications = NotificationController.getUserNotifications;
export const getUnreadCount = NotificationController.getUnreadCount;
export const markAsRead = NotificationController.markAsRead;
export const markAllAsRead = NotificationController.markAllAsRead;
export const archiveNotification = NotificationController.archiveNotification;

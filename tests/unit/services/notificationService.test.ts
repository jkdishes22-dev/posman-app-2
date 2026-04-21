import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRepository } from "../mocks/createMockDataSource";

const mockNotificationRepo = createMockRepository();
const mockUserRepo = createMockRepository();

vi.mock("@backend/config/data-source", () => ({
  AppDataSource: {
    getRepository: vi.fn().mockImplementation((entity: any) => {
      if (entity?.name === "Notification") return mockNotificationRepo;
      return mockUserRepo;
    }),
  },
}));

import { NotificationService } from "@backend/service/NotificationService";
import { NotificationType, NotificationStatus } from "@backend/entities/Notification";

describe("NotificationService", () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationService();
  });

  describe("createNotification", () => {
    it("creates notification with UNREAD status and saves it", async () => {
      const saved = { id: 1, title: "Alert", status: NotificationStatus.UNREAD };
      mockNotificationRepo.create.mockReturnValue(saved);
      mockNotificationRepo.save.mockResolvedValue(saved);

      const result = await service.createNotification(
        NotificationType.BILL_REOPENED,
        "Alert",
        "Bill reopened",
        5,
        3
      );

      expect(mockNotificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: NotificationStatus.UNREAD })
      );
      expect(result).toEqual(saved);
    });
  });

  describe("getUnreadCount", () => {
    it("counts UNREAD notifications for user", async () => {
      mockNotificationRepo.count.mockResolvedValue(3);

      const result = await service.getUnreadCount(5);

      expect(mockNotificationRepo.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: 5, status: NotificationStatus.UNREAD },
        })
      );
      expect(result).toBe(3);
    });
  });

  describe("markAsRead", () => {
    it("returns null when notification not found", async () => {
      mockNotificationRepo.findOne.mockResolvedValue(null);

      const result = await service.markAsRead(99, 1);

      expect(result).toBeNull();
    });

    it("updates status to READ and saves", async () => {
      const notification = { id: 1, user_id: 1, status: NotificationStatus.UNREAD };
      mockNotificationRepo.findOne.mockResolvedValue(notification);
      mockNotificationRepo.save.mockResolvedValue({ ...notification, status: NotificationStatus.READ });

      const result = await service.markAsRead(1, 1);

      expect(mockNotificationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: NotificationStatus.READ })
      );
      expect(result?.status).toBe(NotificationStatus.READ);
    });
  });

  describe("markAllAsRead", () => {
    it("updates all UNREAD notifications for a user to READ", async () => {
      await service.markAllAsRead(7);

      expect(mockNotificationRepo.update).toHaveBeenCalledWith(
        { user_id: 7, status: NotificationStatus.UNREAD },
        { status: NotificationStatus.READ }
      );
    });
  });

  describe("getUserNotifications", () => {
    it("applies userId filter and returns results", async () => {
      const notifications = [{ id: 1, user_id: 5 }];
      const qb = mockNotificationRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue(notifications);

      const result = await service.getUserNotifications(5);

      expect(qb.where).toHaveBeenCalledWith("notification.user_id = :userId", { userId: 5 });
      expect(result).toEqual(notifications);
    });

    it("applies status filter when provided", async () => {
      const qb = mockNotificationRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue([]);

      await service.getUserNotifications(5, NotificationStatus.UNREAD);

      expect(qb.andWhere).toHaveBeenCalledWith(
        "notification.status = :status",
        { status: NotificationStatus.UNREAD }
      );
    });
  });
});

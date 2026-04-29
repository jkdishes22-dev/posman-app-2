import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDataSource, createMockRepository, createMockTransactionalEntityManager } from "../mocks/createMockDataSource";

const mockGetAvailableInventoryForItems = vi.fn();
const mockReserveInventoryForBill = vi.fn().mockResolvedValue({});

vi.mock("@backend/service/InventoryService", () => ({
  InventoryService: vi.fn().mockImplementation(() => ({
    getAvailableInventoryForItems: mockGetAvailableInventoryForItems,
    reserveInventoryForBill: mockReserveInventoryForBill,
    reduceInventoryForBill: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock("@backend/service/UserService", () => ({
  UserService: vi.fn().mockImplementation(() => ({
    getUserWithRolesAndPermissions: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock("@backend/service/NotificationService", () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    createBillReopenedNotification: vi.fn().mockResolvedValue({}),
    createBillResubmittedNotification: vi.fn().mockResolvedValue({}),
    createVoidRequestNotification: vi.fn().mockResolvedValue({}),
    createVoidApprovedNotification: vi.fn().mockResolvedValue({}),
    createVoidRejectedNotification: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock("@backend/config/data-source", () => ({
  AppDataSource: {
    query: vi.fn().mockResolvedValue([]),
    createQueryBuilder: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
      getOne: vi.fn().mockResolvedValue(null),
    }),
    transaction: vi.fn().mockImplementation(async (cb: any) =>
      cb(createMockTransactionalEntityManager())
    ),
  },
}));

vi.mock("@backend/config/timezone", () => ({
  getAppTimezone: vi.fn().mockReturnValue("Africa/Nairobi"),
}));

import { BillService } from "@backend/service/BillService";
import { BillStatus } from "@backend/entities/Bill";
import { BillItemStatus } from "@backend/entities/BillItem";
import { AppDataSource } from "@backend/config/data-source";

describe("BillService", () => {
  let mockBillRepo: ReturnType<typeof createMockRepository>;
  let mockBillItemRepo: ReturnType<typeof createMockRepository>;
  let service: BillService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBillRepo = createMockRepository();
    mockBillItemRepo = createMockRepository();
    const mockDs = createMockDataSource({
      Bill: mockBillRepo,
      BillItem: mockBillItemRepo,
    });
    service = new BillService(mockDs as any);
  });

  describe("createBill", () => {
    it("throws when item has insufficient inventory", async () => {
      mockGetAvailableInventoryForItems.mockResolvedValue(new Map([[1, 2]]));
      mockBillRepo.manager.getRepository.mockReturnValue({
        find: vi.fn().mockResolvedValue([{ id: 1, name: "Burger", allowNegativeInventory: false }]),
      });

      await expect(
        service.createBill({
          items: [{ item_id: 1, quantity: 5, subtotal: 500 }],
          total: 500,
          user_id: 1,
          station_id: null,
        })
      ).rejects.toThrow("Insufficient inventory");
    });

    it("skips inventory check for items that allow negative inventory", async () => {
      mockGetAvailableInventoryForItems.mockResolvedValue(new Map([[1, 0]]));
      mockBillRepo.manager.getRepository.mockReturnValue({
        find: vi.fn().mockResolvedValue([
          { id: 1, name: "Burger", allowNegativeInventory: true },
        ]),
      });

      const txn = createMockTransactionalEntityManager();
      txn.findOne.mockResolvedValue(null); // no existing bill by request_id
      // First save(Bill, data) returns the bill; second save(BillItem, [items]) returns the items array
      txn.save
        .mockResolvedValueOnce({ id: 10, status: BillStatus.PENDING }) // save Bill
        .mockImplementation(async (_cls: any, data: any) => Array.isArray(data) ? data : [data]); // save BillItems
      txn.find = vi.fn().mockResolvedValue([]);
      mockBillRepo.manager.transaction.mockImplementationOnce(async (cb: any) => cb(txn));

      await service.createBill({
        items: [{ item_id: 1, quantity: 100, subtotal: 500 }],
        total: 500,
        user_id: 1,
        station_id: null,
      });

      expect(mockReserveInventoryForBill).toHaveBeenCalled();
    });

    it("returns existing bill when request_id matches (idempotency)", async () => {
      mockGetAvailableInventoryForItems.mockResolvedValue(new Map());
      mockBillRepo.manager.getRepository.mockReturnValue({
        find: vi.fn().mockResolvedValue([]),
      });

      const existingBill = { id: 5, status: BillStatus.PENDING, request_id: "req-123" };
      const txn = createMockTransactionalEntityManager();
      txn.findOne.mockResolvedValue(existingBill);
      mockBillRepo.manager.transaction.mockImplementationOnce(async (cb: any) => cb(txn));

      const result = await service.createBill({
        items: [],
        total: 0,
        user_id: 1,
        station_id: null,
        request_id: "req-123",
      });

      expect(result).toEqual(existingBill);
    });
  });

  describe("submitBill", () => {
    it("rejects duplicate MPESA references after normalization", async () => {
      const mockPaymentRepo = createMockRepository();
      const mockBillPaymentRepo = createMockRepository();
      const mockDs = createMockDataSource({
        Bill: mockBillRepo,
        BillItem: mockBillItemRepo,
        Payment: mockPaymentRepo,
        BillPayment: mockBillPaymentRepo,
      });
      service = new BillService(mockDs as any);

      const billQueryBuilder: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({
          id: 10,
          total: 100,
          user_id: 5,
          status: BillStatus.PENDING,
        }),
      };

      (AppDataSource.createQueryBuilder as any).mockReturnValueOnce(billQueryBuilder);
      mockPaymentRepo.createQueryBuilder().getCount.mockResolvedValue(1);

      await expect(
        service.submitBill({
          billId: 10,
          userId: 5,
          paymentMethod: "mpesa",
          mpesaAmount: 100,
          mpesaCode: "  abC123 ",
        } as any)
      ).rejects.toThrow("M-Pesa reference code already exists");

      expect(AppDataSource.transaction).not.toHaveBeenCalled();
    });
  });
});

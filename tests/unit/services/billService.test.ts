import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDataSource, createMockRepository, createMockTransactionalEntityManager } from "../mocks/createMockDataSource";

const mockGetAvailableInventoryForItems = vi.fn();
const mockReserveInventoryForBill = vi.fn().mockResolvedValue({});

vi.mock("@backend/service/InventoryService", () => ({
  InventoryService: Object.assign(
    vi.fn().mockImplementation(() => ({
      getAvailableInventoryForItems: mockGetAvailableInventoryForItems,
      reserveInventoryForBill: mockReserveInventoryForBill,
      reduceInventoryForBill: vi.fn().mockResolvedValue({}),
    })),
    { invalidateInventoryCache: vi.fn() },
  ),
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
import { InventoryService } from "@backend/service/InventoryService";
import { BillStatus } from "@backend/entities/Bill";
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
        findOne: vi.fn().mockResolvedValue({ id: 1, name: "Burger" }),
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
      // InventoryService returns 999999 for allowNegativeInventory=true items; simulate that here
      mockGetAvailableInventoryForItems.mockResolvedValue(new Map([[1, 999999]]));

      const txn = createMockTransactionalEntityManager();
      txn.findOne.mockResolvedValue(null); // no existing bill by request_id
      txn.insert
        .mockResolvedValueOnce({ identifiers: [{ id: 10 }], generatedMaps: [] }) // insert Bill
        .mockResolvedValueOnce({ identifiers: [{ id: 100 }], generatedMaps: [] }); // insert BillItems
      txn.find = vi.fn().mockResolvedValue([]);
      mockBillRepo.manager.transaction.mockImplementationOnce(async (cb: any) => cb(txn));

      await service.createBill({
        items: [{ item_id: 1, quantity: 100, subtotal: 500 }],
        total: 500,
        user_id: 1,
        station_id: null,
      });

      expect(InventoryService.invalidateInventoryCache).toHaveBeenCalled();
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

    it("persists tags as JSON string when provided", async () => {
      mockGetAvailableInventoryForItems.mockResolvedValue(new Map([[1, 999999]]));

      const txn = createMockTransactionalEntityManager();
      txn.findOne.mockResolvedValue(null);
      txn.insert
        .mockResolvedValueOnce({ identifiers: [{ id: 20 }], generatedMaps: [] })
        .mockResolvedValueOnce({ identifiers: [{ id: 200 }], generatedMaps: [] });
      txn.find = vi.fn().mockResolvedValue([]);
      mockBillRepo.manager.transaction.mockImplementationOnce(async (cb: any) => cb(txn));

      await service.createBill({
        items: [{ item_id: 1, quantity: 1, subtotal: 100 }],
        total: 100,
        user_id: 1,
        station_id: null,
        tags: ["Alice (Sales)"],
      });

      const billInsertCall = txn.insert.mock.calls[0];
      expect(billInsertCall[1]).toMatchObject({ tags: '["Alice (Sales)"]' });
    });

    it("persists notes when provided and sets tags/notes to null when omitted", async () => {
      mockGetAvailableInventoryForItems.mockResolvedValue(new Map([[1, 999999]]));

      const txn = createMockTransactionalEntityManager();
      txn.findOne.mockResolvedValue(null);
      txn.insert
        .mockResolvedValueOnce({ identifiers: [{ id: 21 }], generatedMaps: [] })
        .mockResolvedValueOnce({ identifiers: [{ id: 201 }], generatedMaps: [] });
      txn.find = vi.fn().mockResolvedValue([]);
      mockBillRepo.manager.transaction.mockImplementationOnce(async (cb: any) => cb(txn));

      await service.createBill({
        items: [{ item_id: 1, quantity: 1, subtotal: 100 }],
        total: 100,
        user_id: 1,
        station_id: null,
        notes: "For table 5",
      });

      const billInsertCall = txn.insert.mock.calls[0];
      expect(billInsertCall[1]).toMatchObject({ notes: "For table 5", tags: null });
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

  describe("closeBill", () => {
    it("runs close flow in a transaction and updates bill + items", async () => {
      const updateQbBill = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ affected: 1 }),
      };
      const updateQbItems = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ affected: 2 }),
      };
      const readQb = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi
          .fn()
          .mockResolvedValueOnce({
            id: 4,
            total: 100,
            bill_payments: [{ payment: { creditAmount: 100 } }],
          })
          .mockResolvedValueOnce({ id: 4, status: BillStatus.CLOSED }),
      };

      const manager = {
        createQueryBuilder: vi
          .fn()
          .mockReturnValueOnce(readQb)
          .mockReturnValueOnce(updateQbBill)
          .mockReturnValueOnce(updateQbItems)
          .mockReturnValueOnce(readQb),
      };
      (AppDataSource.transaction as any).mockImplementationOnce(async (cb: any) => cb(manager));

      const result = await service.closeBill(4);

      expect(AppDataSource.transaction).toHaveBeenCalled();
      expect(updateQbBill.update).toHaveBeenCalled();
      expect(updateQbItems.update).toHaveBeenCalled();
      expect(result).toBeTruthy();
    });
  });
});

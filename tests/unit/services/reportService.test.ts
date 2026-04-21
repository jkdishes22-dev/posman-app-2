import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReportService } from "@backend/service/ReportService";
import {
  createMockDataSource,
  createMockRepository,
  createMockQueryBuilder,
} from "../mocks/createMockDataSource";

describe("ReportService", () => {
  let mockBillRepo: ReturnType<typeof createMockRepository>;
  let mockBillItemRepo: ReturnType<typeof createMockRepository>;
  let mockPORepo: ReturnType<typeof createMockRepository>;
  let mockPOItemRepo: ReturnType<typeof createMockRepository>;
  let mockItemRepo: ReturnType<typeof createMockRepository>;
  let mockUserRepo: ReturnType<typeof createMockRepository>;
  let mockSupplierRepo: ReturnType<typeof createMockRepository>;
  let mockProductionPrepRepo: ReturnType<typeof createMockRepository>;
  let service: ReportService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBillRepo = createMockRepository();
    mockBillItemRepo = createMockRepository();
    mockPORepo = createMockRepository();
    mockPOItemRepo = createMockRepository();
    mockItemRepo = createMockRepository();
    mockUserRepo = createMockRepository();
    mockSupplierRepo = createMockRepository();
    mockProductionPrepRepo = createMockRepository();

    const mockDs = createMockDataSource({
      Bill: mockBillRepo,
      BillItem: mockBillItemRepo,
      PurchaseOrder: mockPORepo,
      PurchaseOrderItem: mockPOItemRepo,
      Item: mockItemRepo,
      User: mockUserRepo,
      Supplier: mockSupplierRepo,
      ProductionPreparation: mockProductionPrepRepo,
    });
    service = new ReportService(mockDs as any);
  });

  describe("getSalesRevenueReport", () => {
    it("throws when startDate or endDate is missing", async () => {
      await expect(service.getSalesRevenueReport({})).rejects.toThrow(
        "Start date and end date are required"
      );
    });

    it("returns empty array when no bills exist in range", async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      mockBillRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getSalesRevenueReport({
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });

      expect(result).toEqual([]);
    });

    it("aggregates actual revenue from closed bills", async () => {
      const qb = createMockQueryBuilder();
      const closedBill = {
        id: 1,
        status: "closed",
        total: 1500,
        created_at: new Date("2026-01-15"),
        bill_items: [
          { status: "completed", subtotal: 800 },
          { status: "completed", subtotal: 700 },
        ],
      };
      qb.getMany
        .mockResolvedValueOnce([closedBill]) // actual bills
        .mockResolvedValueOnce([]); // projected bills
      mockBillRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getSalesRevenueReport({
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });

      expect(result).toHaveLength(1);
      expect(result[0].actualRevenue).toBe(1500);
    });
  });

  describe("getExpenditureReport", () => {
    it("returns empty array when no received purchase orders exist", async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      mockPORepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getExpenditureReport({
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });

      expect(result).toEqual([]);
    });

    it("throws when startDate or endDate is missing", async () => {
      await expect(service.getExpenditureReport({})).rejects.toThrow(
        "Start date and end date are required"
      );
    });
  });

  describe("getItemsSoldCountReport", () => {
    it("throws when startDate or endDate is missing", async () => {
      await expect(service.getItemsSoldCountReport({})).rejects.toThrow(
        "Start date and end date are required"
      );
    });

    it("returns empty array when no bill items in range", async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      mockBillItemRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getItemsSoldCountReport({
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });

      expect(result).toEqual([]);
    });
  });

  describe("getVoidedItemsReport", () => {
    it("throws when startDate or endDate is missing", async () => {
      await expect(service.getVoidedItemsReport({})).rejects.toThrow(
        "Start date and end date are required"
      );
    });

    it("returns only voided items (filters by VOIDED status)", async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      mockBillItemRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getVoidedItemsReport({
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });

      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining("voided"),
        expect.anything()
      );
    });
  });
});

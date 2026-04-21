import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditService } from "@backend/service/AuditService";
import {
  createMockDataSource,
  createMockRepository,
} from "../mocks/createMockDataSource";

vi.mock("@backend/utils/logger", () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("AuditService", () => {
  let mockPricelistItemAuditRepo: ReturnType<typeof createMockRepository>;
  let mockItemAuditRepo: ReturnType<typeof createMockRepository>;
  let mockPricelistItemRepo: ReturnType<typeof createMockRepository>;
  let service: AuditService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPricelistItemAuditRepo = createMockRepository();
    mockItemAuditRepo = createMockRepository();
    mockPricelistItemRepo = createMockRepository();
    const mockDs = createMockDataSource({
      PricelistItemAudit: mockPricelistItemAuditRepo,
      ItemAudit: mockItemAuditRepo,
      PricelistItem: mockPricelistItemRepo,
    });
    service = new AuditService(mockDs as any);
  });

  describe("logPricelistItemChange", () => {
    it("creates and saves an audit log entry with stringified values", async () => {
      await service.logPricelistItemChange(1, "price", 100, 200, 42);

      expect(mockPricelistItemAuditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pricelist_item_id: 1,
          field_name: "price",
          old_value: "100",
          new_value: "200",
          changed_by: 42,
        })
      );
      expect(mockPricelistItemAuditRepo.save).toHaveBeenCalled();
    });

    it("stores null for null old/new values", async () => {
      await service.logPricelistItemChange(1, "price", null, null, 5);

      expect(mockPricelistItemAuditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ old_value: null, new_value: null })
      );
    });

    it("does NOT throw when repository.save fails (audit must not break callers)", async () => {
      mockPricelistItemAuditRepo.save.mockRejectedValue(new Error("DB error"));

      await expect(
        service.logPricelistItemChange(1, "price", 100, 200, 42)
      ).resolves.toBeUndefined();
    });
  });

  describe("logItemChange", () => {
    it("saves an item audit log with correct fields", async () => {
      await service.logItemChange(7, "name", "Old Name", "New Name", 3);

      expect(mockItemAuditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          item_id: 7,
          field_name: "name",
          old_value: "Old Name",
          new_value: "New Name",
          changed_by: 3,
        })
      );
    });

    it("does NOT throw when repository.save fails", async () => {
      mockItemAuditRepo.save.mockRejectedValue(new Error("connection lost"));

      await expect(
        service.logItemChange(1, "name", "a", "b", 1)
      ).resolves.toBeUndefined();
    });
  });

  describe("getPricelistItemAuditLog", () => {
    it("returns audit entries for a given pricelist item id", async () => {
      const entries = [{ id: 1, pricelist_item_id: 5 }];
      mockPricelistItemAuditRepo.find.mockResolvedValue(entries);

      const result = await service.getPricelistItemAuditLog(5);

      expect(mockPricelistItemAuditRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { pricelist_item_id: 5 } })
      );
      expect(result).toEqual(entries);
    });

    it("returns empty array when table does not exist", async () => {
      mockPricelistItemAuditRepo.find.mockRejectedValue(
        new Error("Table 'pricelist_item_audit' doesn't exist")
      );

      const result = await service.getPricelistItemAuditLog(5);

      expect(result).toEqual([]);
    });
  });

  describe("getPricelistAuditLog", () => {
    it("returns empty arrays when no pricelist items exist", async () => {
      const qb = mockPricelistItemRepo.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([]);

      const result = await service.getPricelistAuditLog(1);

      expect(result).toEqual({ pricelistItemAudits: [], itemAudits: [] });
    });
  });
});

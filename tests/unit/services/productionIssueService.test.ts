import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockDataSource,
  createMockRepository,
} from "../mocks/createMockDataSource";

const mockAddInventoryFromProduction = vi.fn().mockResolvedValue({});

vi.mock("@backend/service/InventoryService", () => ({
  InventoryService: vi.fn().mockImplementation(() => ({
    addInventoryFromProduction: mockAddInventoryFromProduction,
  })),
}));

import { ProductionIssueService } from "@backend/service/ProductionIssueService";
import { ProductionIssueStatus } from "@backend/entities/ProductionIssue";

describe("ProductionIssueService", () => {
  let mockIssueRepo: ReturnType<typeof createMockRepository>;
  let mockItemRepo: ReturnType<typeof createMockRepository>;
  let service: ProductionIssueService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIssueRepo = createMockRepository();
    mockItemRepo = createMockRepository();
    const mockDs = createMockDataSource({
      ProductionIssue: mockIssueRepo,
      Item: mockItemRepo,
    });
    service = new ProductionIssueService(mockDs as any);
  });

  describe("createProductionIssue", () => {
    it("throws when item does not exist", async () => {
      mockItemRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createProductionIssue({ item_id: 99, quantity_produced: 5 }, 1)
      ).rejects.toThrow("Item 99 not found");
    });

    it("throws when quantity_produced is 0 or negative", async () => {
      mockItemRepo.findOne.mockResolvedValue({ id: 1 });

      await expect(
        service.createProductionIssue({ item_id: 1, quantity_produced: 0 }, 1)
      ).rejects.toThrow("Quantity produced must be greater than 0");
    });

    it("creates issue with COMPLETED status and calls addInventoryFromProduction", async () => {
      const item = { id: 1, name: "Burger" };
      const savedIssue = { id: 10, item_id: 1, quantity_produced: 5, status: ProductionIssueStatus.COMPLETED };
      mockItemRepo.findOne.mockResolvedValue(item);
      mockIssueRepo.create.mockReturnValue(savedIssue);
      mockIssueRepo.save.mockResolvedValue(savedIssue);

      const result = await service.createProductionIssue({ item_id: 1, quantity_produced: 5 }, 1);

      expect(mockIssueRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductionIssueStatus.COMPLETED })
      );
      expect(mockAddInventoryFromProduction).toHaveBeenCalledWith(1, 5, 10, 1);
      expect(result).toEqual(savedIssue);
    });
  });

  describe("fetchProductionIssues", () => {
    it("returns issues and total with no filters", async () => {
      const qb = mockIssueRepo.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[{ id: 1 }], 1]);

      const result = await service.fetchProductionIssues();

      expect(result).toEqual({ issues: [{ id: 1 }], total: 1 });
    });

    it("applies item_id filter when provided", async () => {
      const qb = mockIssueRepo.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.fetchProductionIssues({ item_id: 5 });

      expect(qb.andWhere).toHaveBeenCalledWith(
        "issue.item_id = :item_id",
        { item_id: 5 }
      );
    });
  });

  describe("cancelProductionIssue", () => {
    it("throws when issue not found", async () => {
      mockIssueRepo.findOne.mockResolvedValue(null);

      await expect(service.cancelProductionIssue(99, 1)).rejects.toThrow(
        "Production issue 99 not found"
      );
    });

    it("throws when issue is already COMPLETED", async () => {
      mockIssueRepo.findOne.mockResolvedValue({
        id: 1,
        status: ProductionIssueStatus.COMPLETED,
      });

      await expect(service.cancelProductionIssue(1, 1)).rejects.toThrow(
        "Cannot cancel a completed production issue"
      );
    });
  });
});

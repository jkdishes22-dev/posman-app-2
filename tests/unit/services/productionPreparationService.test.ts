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

import { ProductionPreparationService } from "@backend/service/ProductionPreparationService";
import { ProductionPreparationStatus } from "@backend/entities/ProductionPreparation";

describe("ProductionPreparationService", () => {
  let mockPrepRepo: ReturnType<typeof createMockRepository>;
  let mockItemRepo: ReturnType<typeof createMockRepository>;
  let mockUserRepo: ReturnType<typeof createMockRepository>;
  let service: ProductionPreparationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrepRepo = createMockRepository();
    mockItemRepo = createMockRepository();
    mockUserRepo = createMockRepository();
    const mockDs = createMockDataSource({
      ProductionPreparation: mockPrepRepo,
      Item: mockItemRepo,
      User: mockUserRepo,
    });
    service = new ProductionPreparationService(mockDs as any);
  });

  describe("createPreparation", () => {
    it("throws when item does not exist", async () => {
      mockItemRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createPreparation({ item_id: 99, quantity_prepared: 5 }, 1)
      ).rejects.toThrow("Item 99 not found");
    });

    it("throws when quantity is zero or negative", async () => {
      mockItemRepo.findOne.mockResolvedValue({ id: 1 });

      await expect(
        service.createPreparation({ item_id: 1, quantity_prepared: -1 }, 1)
      ).rejects.toThrow("Quantity prepared must be greater than 0");
    });

    it("throws when user does not exist", async () => {
      mockItemRepo.findOne.mockResolvedValue({ id: 1 });
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createPreparation({ item_id: 1, quantity_prepared: 3 }, 99)
      ).rejects.toThrow("User 99 not found");
    });

    it("creates preparation with PENDING status", async () => {
      mockItemRepo.findOne.mockResolvedValue({ id: 1 });
      mockUserRepo.findOne.mockResolvedValue({ id: 1 });
      const saved = { id: 5, status: ProductionPreparationStatus.PENDING };
      mockPrepRepo.create.mockReturnValue(saved);
      mockPrepRepo.save.mockResolvedValue(saved);

      const result = await service.createPreparation({ item_id: 1, quantity_prepared: 3 }, 1);

      expect(mockPrepRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductionPreparationStatus.PENDING })
      );
      expect(result).toEqual(saved);
    });
  });

  describe("approvePreparation", () => {
    it("throws when preparation not found", async () => {
      mockPrepRepo.findOne.mockResolvedValue(null);

      await expect(service.approvePreparation(99, 1)).rejects.toThrow(
        "Preparation 99 not found"
      );
    });

    it("throws when preparation is not PENDING", async () => {
      mockPrepRepo.findOne.mockResolvedValue({
        id: 1,
        status: ProductionPreparationStatus.ISSUED,
      });

      await expect(service.approvePreparation(1, 1)).rejects.toThrow(
        "Cannot approve"
      );
    });

    it("calls addInventoryFromProduction after successful approval", async () => {
      const prep = {
        id: 1,
        item_id: 3,
        quantity_prepared: 10,
        status: ProductionPreparationStatus.PENDING,
      };
      mockPrepRepo.findOne.mockResolvedValue(prep);
      mockUserRepo.findOne.mockResolvedValue({ id: 1 });
      mockPrepRepo.save.mockResolvedValue({
        ...prep,
        status: ProductionPreparationStatus.ISSUED,
      });

      await service.approvePreparation(1, 1);

      expect(mockAddInventoryFromProduction).toHaveBeenCalledWith(3, 10, 1, 1);
    });

    it("does NOT call addInventoryFromProduction when approval fails", async () => {
      mockPrepRepo.findOne.mockResolvedValue({
        id: 1,
        status: ProductionPreparationStatus.REJECTED,
      });

      await expect(service.approvePreparation(1, 1)).rejects.toThrow();
      expect(mockAddInventoryFromProduction).not.toHaveBeenCalled();
    });
  });

  describe("rejectPreparation", () => {
    it("throws when preparation is not PENDING", async () => {
      mockPrepRepo.findOne.mockResolvedValue({
        id: 1,
        status: ProductionPreparationStatus.ISSUED,
      });

      await expect(service.rejectPreparation(1, 1, "Wrong item")).rejects.toThrow(
        "Cannot reject"
      );
    });

    it("does NOT call addInventoryFromProduction on rejection", async () => {
      mockPrepRepo.findOne.mockResolvedValue({
        id: 1,
        status: ProductionPreparationStatus.PENDING,
      });
      mockUserRepo.findOne.mockResolvedValue({ id: 1 });
      mockPrepRepo.save.mockResolvedValue({});

      await service.rejectPreparation(1, 1, "Not needed");

      expect(mockAddInventoryFromProduction).not.toHaveBeenCalled();
    });

    it("sets REJECTED status with rejection reason", async () => {
      const prep = { id: 1, status: ProductionPreparationStatus.PENDING };
      mockPrepRepo.findOne.mockResolvedValue(prep);
      mockUserRepo.findOne.mockResolvedValue({ id: 1 });
      mockPrepRepo.save.mockResolvedValue({});

      await service.rejectPreparation(1, 1, "Quality issue");

      expect(mockPrepRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ProductionPreparationStatus.REJECTED,
          rejection_reason: "Quality issue",
        })
      );
    });
  });
});

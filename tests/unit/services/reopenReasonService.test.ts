import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReopenReasonService } from "@backend/service/ReopenReasonService";
import {
  createMockDataSource,
  createMockRepository,
} from "../mocks/createMockDataSource";

describe("ReopenReasonService", () => {
  let mockRepo: ReturnType<typeof createMockRepository>;
  let service: ReopenReasonService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = createMockRepository();
    const mockDs = createMockDataSource({ ReopenReason: mockRepo });
    service = new ReopenReasonService(mockDs as any);
  });

  describe("getAllActiveReasons", () => {
    it("returns only active reasons ordered by sort_order", async () => {
      const reasons = [{ id: 1, name: "Wrong item", is_active: true }];
      mockRepo.find.mockResolvedValue(reasons);

      const result = await service.getAllActiveReasons();

      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { is_active: true } })
      );
      expect(result).toEqual(reasons);
    });
  });

  describe("getReasonByKey", () => {
    it("returns null when key does not match an active reason", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.getReasonByKey("nonexistent");

      expect(result).toBeNull();
    });

    it("returns reason when key matches an active reason", async () => {
      const reason = { id: 1, reason_key: "error", is_active: true };
      mockRepo.findOne.mockResolvedValue(reason);

      const result = await service.getReasonByKey("error");

      expect(result).toEqual(reason);
    });
  });

  describe("createReason", () => {
    it("creates and saves a new reason", async () => {
      const data = { name: "Wrong Price", reason_key: "wrong_price" };
      const saved = { id: 1, ...data };
      mockRepo.create.mockReturnValue(data);
      mockRepo.save.mockResolvedValue(saved);

      const result = await service.createReason(data);

      expect(mockRepo.create).toHaveBeenCalledWith(data);
      expect(result).toEqual(saved);
    });
  });

  describe("deleteReason", () => {
    it("calls repo.delete and returns true when a row was deleted", async () => {
      mockRepo.delete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteReason(1);

      expect(mockRepo.delete).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it("returns false when no row was deleted", async () => {
      mockRepo.delete.mockResolvedValue({ affected: 0 });

      const result = await service.deleteReason(999);

      expect(result).toBe(false);
    });
  });

  describe("toggleReasonStatus", () => {
    it("returns null when reason not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.toggleReasonStatus(99);

      expect(result).toBeNull();
    });

    it("flips is_active from true to false and saves", async () => {
      const reason = { id: 1, is_active: true };
      mockRepo.findOne.mockResolvedValue(reason);
      mockRepo.save.mockResolvedValue({ ...reason, is_active: false });

      const result = await service.toggleReasonStatus(1);

      expect(mockRepo.save).toHaveBeenCalledWith({ id: 1, is_active: false });
      expect(result?.is_active).toBe(false);
    });

    it("flips is_active from false to true and saves", async () => {
      const reason = { id: 2, is_active: false };
      mockRepo.findOne.mockResolvedValue(reason);
      mockRepo.save.mockResolvedValue({ ...reason, is_active: true });

      await service.toggleReasonStatus(2);

      expect(mockRepo.save).toHaveBeenCalledWith({ id: 2, is_active: true });
    });
  });
});

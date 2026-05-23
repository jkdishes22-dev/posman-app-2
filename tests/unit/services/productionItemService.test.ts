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

import { ProductionItemService } from "@backend/service/ProductionItemService";
import { ProductionItemStatus } from "@backend/entities/ProductionItem";
import { ProductionStatus } from "@backend/entities/Production";

/** Minimal raw SQL row matching the JOIN shape fetchItems/fetchItemById expect */
function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    production_id: 10,
    item_id: 2,
    quantity_produced: 5,
    status: ProductionItemStatus.ISSUED,
    issued_by: 7,
    issued_at: new Date("2024-01-01"),
    notes: null,
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-01"),
    created_by: 7,
    updated_by: null,
    // production join
    p_id: 10,
    p_name: "Morning Run",
    p_status: ProductionStatus.OPEN,
    // item join
    it_id: 2,
    it_name: "Beef Stew",
    it_code: "BS01",
    it_status: "ACTIVE",
    it_category_id: null,
    it_default_unit_id: null,
    it_is_group: 0,
    it_is_stock: 1,
    it_allow_negative_inventory: 0,
    it_created_at: new Date("2024-01-01"),
    it_updated_at: new Date("2024-01-01"),
    it_created_by: null,
    it_updated_by: null,
    // user join
    iu_id: 7,
    iu_firstName: "Jane",
    iu_lastName: "Doe",
    iu_username: "janedoe",
    ...overrides,
  };
}

describe("ProductionItemService", () => {
  let mockProductionItemRepo: ReturnType<typeof createMockRepository>;
  let mockProductionRepo: ReturnType<typeof createMockRepository>;
  let mockItemRepo: ReturnType<typeof createMockRepository>;
  let mockUserRepo: ReturnType<typeof createMockRepository>;
  let service: ProductionItemService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProductionItemRepo = createMockRepository();
    mockProductionRepo = createMockRepository();
    mockItemRepo = createMockRepository();
    mockUserRepo = createMockRepository();

    const mockDs = createMockDataSource({
      ProductionItem: mockProductionItemRepo,
      Production: mockProductionRepo,
      Item: mockItemRepo,
      User: mockUserRepo,
    });
    service = new ProductionItemService(mockDs as any);
  });

  // ─── issueItem ────────────────────────────────────────────────────────────

  describe("issueItem", () => {
    it("throws when production is not found", async () => {
      mockProductionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.issueItem({ production_id: 99, item_id: 1, quantity_produced: 2 }, 1)
      ).rejects.toThrow("Production 99 not found");
    });

    it("throws when production is not OPEN", async () => {
      mockProductionRepo.findOne.mockResolvedValue({
        id: 1,
        status: ProductionStatus.CLOSED,
      });

      await expect(
        service.issueItem({ production_id: 1, item_id: 1, quantity_produced: 2 }, 1)
      ).rejects.toThrow("closed");
    });

    it("throws when item is not found", async () => {
      mockProductionRepo.findOne.mockResolvedValue({ id: 1, status: ProductionStatus.OPEN });
      mockItemRepo.findOne.mockResolvedValue(null);

      await expect(
        service.issueItem({ production_id: 1, item_id: 99, quantity_produced: 2 }, 1)
      ).rejects.toThrow("Item 99 not found");
    });

    it("throws when item is a group/composite item", async () => {
      mockProductionRepo.findOne.mockResolvedValue({ id: 1, status: ProductionStatus.OPEN });
      mockItemRepo.findOne.mockResolvedValue({ id: 1, isGroup: true });

      await expect(
        service.issueItem({ production_id: 1, item_id: 1, quantity_produced: 2 }, 1)
      ).rejects.toThrow("Grouped/composite items cannot be issued directly");
    });

    it("throws when quantity_produced is zero", async () => {
      mockProductionRepo.findOne.mockResolvedValue({ id: 1, status: ProductionStatus.OPEN });
      mockItemRepo.findOne.mockResolvedValue({ id: 1, isGroup: false });

      await expect(
        service.issueItem({ production_id: 1, item_id: 1, quantity_produced: 0 }, 1)
      ).rejects.toThrow("Quantity must be greater than 0");
    });

    it("throws when quantity_produced is negative", async () => {
      mockProductionRepo.findOne.mockResolvedValue({ id: 1, status: ProductionStatus.OPEN });
      mockItemRepo.findOne.mockResolvedValue({ id: 1, isGroup: false });

      await expect(
        service.issueItem({ production_id: 1, item_id: 1, quantity_produced: -3 }, 1)
      ).rejects.toThrow("Quantity must be greater than 0");
    });

    it("throws when user is not found", async () => {
      mockProductionRepo.findOne.mockResolvedValue({ id: 1, status: ProductionStatus.OPEN });
      mockItemRepo.findOne.mockResolvedValue({ id: 1, isGroup: false });
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.issueItem({ production_id: 1, item_id: 1, quantity_produced: 2 }, 99)
      ).rejects.toThrow("User 99 not found");
    });

    it("creates a production item with ISSUED status", async () => {
      mockProductionRepo.findOne.mockResolvedValue({ id: 1, status: ProductionStatus.OPEN });
      mockItemRepo.findOne.mockResolvedValue({ id: 2, isGroup: false });
      mockUserRepo.findOne.mockResolvedValue({ id: 5 });
      const saved = { id: 10, item_id: 2, quantity_produced: 3, status: ProductionItemStatus.ISSUED };
      mockProductionItemRepo.create.mockReturnValue(saved);
      mockProductionItemRepo.save.mockResolvedValue(saved);

      const result = await service.issueItem(
        { production_id: 1, item_id: 2, quantity_produced: 3 },
        5
      );

      expect(mockProductionItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ProductionItemStatus.ISSUED,
          issued_by: 5,
          created_by: 5,
          production_id: 1,
          item_id: 2,
          quantity_produced: 3,
        })
      );
      expect(result).toEqual(saved);
    });

    it("calls addInventoryFromProduction with correct args after saving", async () => {
      mockProductionRepo.findOne.mockResolvedValue({ id: 1, status: ProductionStatus.OPEN });
      mockItemRepo.findOne.mockResolvedValue({ id: 2, isGroup: false });
      mockUserRepo.findOne.mockResolvedValue({ id: 5 });
      const saved = { id: 10, item_id: 2, quantity_produced: 3, status: ProductionItemStatus.ISSUED };
      mockProductionItemRepo.create.mockReturnValue(saved);
      mockProductionItemRepo.save.mockResolvedValue(saved);

      await service.issueItem({ production_id: 1, item_id: 2, quantity_produced: 3 }, 5);

      expect(mockAddInventoryFromProduction).toHaveBeenCalledWith(2, 3, 10, 5);
    });

    it("does NOT call addInventoryFromProduction when save fails", async () => {
      mockProductionRepo.findOne.mockResolvedValue({ id: 1, status: ProductionStatus.OPEN });
      mockItemRepo.findOne.mockResolvedValue({ id: 2, isGroup: false });
      mockUserRepo.findOne.mockResolvedValue({ id: 5 });
      mockProductionItemRepo.create.mockReturnValue({});
      mockProductionItemRepo.save.mockRejectedValue(new Error("DB error"));

      await expect(
        service.issueItem({ production_id: 1, item_id: 2, quantity_produced: 3 }, 5)
      ).rejects.toThrow("DB error");

      expect(mockAddInventoryFromProduction).not.toHaveBeenCalled();
    });

    it("uses provided issued_at instead of current time", async () => {
      mockProductionRepo.findOne.mockResolvedValue({ id: 1, status: ProductionStatus.OPEN });
      mockItemRepo.findOne.mockResolvedValue({ id: 2, isGroup: false });
      mockUserRepo.findOne.mockResolvedValue({ id: 5 });
      mockProductionItemRepo.save.mockResolvedValue({ id: 1 });

      const customDate = new Date("2023-06-15T10:00:00Z");
      await service.issueItem(
        { production_id: 1, item_id: 2, quantity_produced: 1, issued_at: customDate },
        5
      );

      const createArg = mockProductionItemRepo.create.mock.calls[0][0];
      expect(new Date(createArg.issued_at).toISOString()).toBe(customDate.toISOString());
    });

    it("stores notes when provided", async () => {
      mockProductionRepo.findOne.mockResolvedValue({ id: 1, status: ProductionStatus.OPEN });
      mockItemRepo.findOne.mockResolvedValue({ id: 2, isGroup: false });
      mockUserRepo.findOne.mockResolvedValue({ id: 5 });
      mockProductionItemRepo.save.mockResolvedValue({ id: 1 });

      await service.issueItem(
        { production_id: 1, item_id: 2, quantity_produced: 1, notes: "Batch A" },
        5
      );

      expect(mockProductionItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ notes: "Batch A" })
      );
    });
  });

  // ─── fetchItems ───────────────────────────────────────────────────────────

  describe("fetchItems", () => {
    it("returns empty items and total 0 when DB has no rows", async () => {
      mockProductionItemRepo.manager.query
        .mockResolvedValueOnce([{ cnt: 0 }])
        .mockResolvedValueOnce([]);

      const result = await service.fetchItems();

      expect(result.total).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it("runs two queries — count then fetch", async () => {
      mockProductionItemRepo.manager.query
        .mockResolvedValueOnce([{ cnt: 1 }])
        .mockResolvedValueOnce([makeRow()]);

      await service.fetchItems();

      expect(mockProductionItemRepo.manager.query).toHaveBeenCalledTimes(2);
    });

    it("maps row to a ProductionItem with item and user data", async () => {
      mockProductionItemRepo.manager.query
        .mockResolvedValueOnce([{ cnt: 1 }])
        .mockResolvedValueOnce([makeRow()]);

      const result = await service.fetchItems();

      expect(result.total).toBe(1);
      const pi = result.items[0];
      expect(pi.id).toBe(1);
      expect(pi.item_id).toBe(2);
      expect(pi.item.name).toBe("Beef Stew");
      expect(pi.issued_by_user?.firstName).toBe("Jane");
      expect(pi.production?.name).toBe("Morning Run");
    });

    it("sets production to null when p_id is absent", async () => {
      mockProductionItemRepo.manager.query
        .mockResolvedValueOnce([{ cnt: 1 }])
        .mockResolvedValueOnce([makeRow({ p_id: null })]);

      const result = await service.fetchItems();

      expect(result.items[0].production).toBeNull();
    });

    it("uses a stub item when it_id is absent", async () => {
      mockProductionItemRepo.manager.query
        .mockResolvedValueOnce([{ cnt: 1 }])
        .mockResolvedValueOnce([makeRow({ it_id: null })]);

      const result = await service.fetchItems();

      expect(result.items[0].item.id).toBe(2); // falls back to { id: item_id }
    });

    it("applies production_id filter in WHERE clause", async () => {
      mockProductionItemRepo.manager.query
        .mockResolvedValueOnce([{ cnt: 0 }])
        .mockResolvedValueOnce([]);

      await service.fetchItems({ production_id: 5 });

      const countSql = String(mockProductionItemRepo.manager.query.mock.calls[0][0]);
      expect(countSql).toContain("pi.production_id = ?");
      expect(mockProductionItemRepo.manager.query.mock.calls[0][1]).toContain(5);
    });

    it("applies item_id filter in WHERE clause", async () => {
      mockProductionItemRepo.manager.query
        .mockResolvedValueOnce([{ cnt: 0 }])
        .mockResolvedValueOnce([]);

      await service.fetchItems({ item_id: 7 });

      const countSql = String(mockProductionItemRepo.manager.query.mock.calls[0][0]);
      expect(countSql).toContain("pi.item_id = ?");
      expect(mockProductionItemRepo.manager.query.mock.calls[0][1]).toContain(7);
    });

    it("applies issued_by filter in WHERE clause", async () => {
      mockProductionItemRepo.manager.query
        .mockResolvedValueOnce([{ cnt: 0 }])
        .mockResolvedValueOnce([]);

      await service.fetchItems({ issued_by: 3 });

      const countSql = String(mockProductionItemRepo.manager.query.mock.calls[0][0]);
      expect(countSql).toContain("pi.issued_by = ?");
    });

    it("applies start_date filter as ISO string", async () => {
      mockProductionItemRepo.manager.query
        .mockResolvedValueOnce([{ cnt: 0 }])
        .mockResolvedValueOnce([]);

      const start = new Date("2024-03-01");
      await service.fetchItems({ start_date: start });

      const countSql = String(mockProductionItemRepo.manager.query.mock.calls[0][0]);
      expect(countSql).toContain("pi.issued_at >= ?");
      const params = mockProductionItemRepo.manager.query.mock.calls[0][1] as string[];
      expect(params[0]).toBe(start.toISOString());
    });

    it("applies end_date filter and sets time to end of day", async () => {
      mockProductionItemRepo.manager.query
        .mockResolvedValueOnce([{ cnt: 0 }])
        .mockResolvedValueOnce([]);

      const end = new Date("2024-03-31");
      await service.fetchItems({ end_date: end });

      const countSql = String(mockProductionItemRepo.manager.query.mock.calls[0][0]);
      expect(countSql).toContain("pi.issued_at <= ?");
      const params = mockProductionItemRepo.manager.query.mock.calls[0][1] as string[];
      // setHours(23,59,59,999) in local time — ISO string ends in :59.999Z regardless of offset
      expect(params[0]).toMatch(/:59\.999Z$/);
    });

    it("passes limit and offset to the fetch query", async () => {
      mockProductionItemRepo.manager.query
        .mockResolvedValueOnce([{ cnt: 0 }])
        .mockResolvedValueOnce([]);

      await service.fetchItems({}, 25, 50);

      const fetchParams = mockProductionItemRepo.manager.query.mock.calls[1][1] as unknown[];
      expect(fetchParams.at(-2)).toBe(25); // limit
      expect(fetchParams.at(-1)).toBe(50); // offset
    });
  });

  // ─── fetchItemById ────────────────────────────────────────────────────────

  describe("fetchItemById", () => {
    it("returns null when no row found", async () => {
      mockProductionItemRepo.manager.query.mockResolvedValue([]);

      const result = await service.fetchItemById(999);

      expect(result).toBeNull();
    });

    it("returns a mapped ProductionItem when row is found", async () => {
      mockProductionItemRepo.manager.query.mockResolvedValue([makeRow()]);

      const result = await service.fetchItemById(1);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);
      expect(result!.quantity_produced).toBe(5);
      expect(result!.item.name).toBe("Beef Stew");
    });

    it("maps production data when p_id is present", async () => {
      mockProductionItemRepo.manager.query.mockResolvedValue([makeRow()]);

      const result = await service.fetchItemById(1);

      expect(result!.production).not.toBeNull();
      expect(result!.production!.id).toBe(10);
      expect(result!.production!.name).toBe("Morning Run");
      expect(result!.production!.status).toBe(ProductionStatus.OPEN);
    });

    it("sets production to null when p_id is absent", async () => {
      mockProductionItemRepo.manager.query.mockResolvedValue([makeRow({ p_id: null })]);

      const result = await service.fetchItemById(1);

      expect(result!.production).toBeNull();
    });

    it("passes the id as a query parameter", async () => {
      mockProductionItemRepo.manager.query.mockResolvedValue([makeRow()]);

      await service.fetchItemById(42);

      expect(mockProductionItemRepo.manager.query.mock.calls[0][1]).toEqual([42]);
    });
  });
});

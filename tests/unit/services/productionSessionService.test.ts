import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockDataSource,
  createMockRepository,
} from "../mocks/createMockDataSource";

import { ProductionSessionService } from "@backend/service/ProductionSessionService";
import { ProductionStatus } from "@backend/entities/Production";
import { ProductionItemStatus } from "@backend/entities/ProductionItem";

/** Minimal raw row for fetchProductions list query */
function makeProductionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    name: "Morning Run",
    description: null,
    status: ProductionStatus.OPEN,
    created_by: 3,
    updated_by: null,
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
    item_count: 2,
    ...overrides,
  };
}

/** Raw row returned by fetchProductionById — includes joined production_item + item + user columns */
function makeDetailRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    name: "Morning Run",
    description: "First shift production",
    status: ProductionStatus.OPEN,
    created_by: 3,
    updated_by: null,
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
    // production_item join
    pi_id: 10,
    pi_production_id: 1,
    pi_item_id: 2,
    pi_quantity_produced: 5,
    pi_status: ProductionItemStatus.ISSUED,
    pi_issued_by: 3,
    pi_issued_at: new Date("2024-06-01T08:00:00Z"),
    pi_notes: null,
    pi_created_at: new Date("2024-06-01"),
    pi_updated_at: new Date("2024-06-01"),
    pi_created_by: 3,
    pi_updated_by: null,
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
    iu_id: 3,
    iu_firstName: "Alice",
    iu_lastName: "Smith",
    iu_username: "alice",
    ...overrides,
  };
}

describe("ProductionSessionService", () => {
  let mockProductionRepo: ReturnType<typeof createMockRepository>;
  let service: ProductionSessionService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProductionRepo = createMockRepository();
    const mockDs = createMockDataSource({ Production: mockProductionRepo });
    service = new ProductionSessionService(mockDs as any);
  });

  // ─── createProduction ─────────────────────────────────────────────────────

  describe("createProduction", () => {
    it("throws when name is an empty string", async () => {
      await expect(
        service.createProduction({ name: "" }, 1)
      ).rejects.toThrow("Production name is required");
    });

    it("throws when name is whitespace only", async () => {
      await expect(
        service.createProduction({ name: "   " }, 1)
      ).rejects.toThrow("Production name is required");
    });

    it("creates a production with OPEN status", async () => {
      const saved = { id: 1, name: "Lunch Batch", status: ProductionStatus.OPEN };
      mockProductionRepo.create.mockReturnValue(saved);
      mockProductionRepo.save.mockResolvedValue(saved);

      const result = await service.createProduction({ name: "Lunch Batch" }, 5);

      expect(mockProductionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductionStatus.OPEN })
      );
      expect(result).toEqual(saved);
    });

    it("trims the name before saving", async () => {
      mockProductionRepo.save.mockResolvedValue({ id: 1 });

      await service.createProduction({ name: "  Dinner Prep  " }, 1);

      expect(mockProductionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Dinner Prep" })
      );
    });

    it("stores null for description when not provided", async () => {
      mockProductionRepo.save.mockResolvedValue({ id: 1 });

      await service.createProduction({ name: "Batch" }, 1);

      expect(mockProductionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: null })
      );
    });

    it("trims description when provided", async () => {
      mockProductionRepo.save.mockResolvedValue({ id: 1 });

      await service.createProduction({ name: "Batch", description: "  notes  " }, 1);

      expect(mockProductionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: "notes" })
      );
    });

    it("sets created_by to the userId", async () => {
      mockProductionRepo.save.mockResolvedValue({ id: 1 });

      await service.createProduction({ name: "Batch" }, 42);

      expect(mockProductionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ created_by: 42 })
      );
    });

    it("throws when an OPEN non-deleted production with the same name exists", async () => {
      mockProductionRepo.findOne.mockResolvedValue({
        id: 1, name: "Morning Run", status: ProductionStatus.OPEN, deleted_at: null,
      });

      await expect(
        service.createProduction({ name: "Morning Run" }, 1)
      ).rejects.toThrow("already exists");
    });

    it("allows creating when an existing production with the same name is CLOSED", async () => {
      mockProductionRepo.findOne.mockResolvedValue({
        id: 1, name: "Morning Run", status: ProductionStatus.CLOSED, deleted_at: null,
      });
      mockProductionRepo.save.mockResolvedValue({ id: 2, name: "Morning Run" });

      const result = await service.createProduction({ name: "Morning Run" }, 1);

      expect(result.id).toBe(2);
    });

    it("allows creating when an existing production with the same name is soft-deleted", async () => {
      mockProductionRepo.findOne.mockResolvedValue({
        id: 1, name: "Morning Run", status: ProductionStatus.OPEN, deleted_at: new Date(),
      });
      mockProductionRepo.save.mockResolvedValue({ id: 2, name: "Morning Run" });

      const result = await service.createProduction({ name: "Morning Run" }, 1);

      expect(result.id).toBe(2);
    });
  });

  // ─── closeProduction ──────────────────────────────────────────────────────

  describe("closeProduction", () => {
    it("throws when production is not found", async () => {
      mockProductionRepo.findOne.mockResolvedValue(null);

      await expect(service.closeProduction(99, 1)).rejects.toThrow(
        "Production 99 not found"
      );
    });

    it("returns the production unchanged when already CLOSED — does not re-save", async () => {
      const closed = { id: 1, status: ProductionStatus.CLOSED };
      mockProductionRepo.findOne.mockResolvedValue(closed);

      const result = await service.closeProduction(1, 5);

      expect(mockProductionRepo.save).not.toHaveBeenCalled();
      expect(result).toEqual(closed);
    });

    it("sets status to CLOSED and saves when currently OPEN", async () => {
      const production = { id: 1, status: ProductionStatus.OPEN };
      mockProductionRepo.findOne.mockResolvedValue(production);
      const saved = { ...production, status: ProductionStatus.CLOSED };
      mockProductionRepo.save.mockResolvedValue(saved);

      const result = await service.closeProduction(1, 5);

      expect(mockProductionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductionStatus.CLOSED })
      );
      expect(result).toEqual(saved);
    });

    it("sets updated_by to the userId when closing", async () => {
      const production = { id: 1, status: ProductionStatus.OPEN };
      mockProductionRepo.findOne.mockResolvedValue(production);
      mockProductionRepo.save.mockResolvedValue({ id: 1 });

      await service.closeProduction(1, 7);

      expect(mockProductionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ updated_by: 7 })
      );
    });
  });

  // ─── fetchProductions ─────────────────────────────────────────────────────

  describe("fetchProductions", () => {
    it("returns empty list and total 0 when no rows", async () => {
      mockProductionRepo.manager.query
        .mockResolvedValueOnce([])          // autoCloseStaleProductions: no production_settings → returns early
        .mockResolvedValueOnce([{ cnt: 0 }])
        .mockResolvedValueOnce([]);

      const result = await service.fetchProductions({});

      expect(result.total).toBe(0);
      expect(result.productions).toHaveLength(0);
    });

    it("runs three queries — auto-close check, count, fetch", async () => {
      mockProductionRepo.manager.query
        .mockResolvedValueOnce([])          // autoCloseStaleProductions: no production_settings → returns early
        .mockResolvedValueOnce([{ cnt: 1 }])
        .mockResolvedValueOnce([makeProductionRow()]);

      await service.fetchProductions({});

      expect(mockProductionRepo.manager.query).toHaveBeenCalledTimes(3);
    });

    it("maps row to Production with item_count", async () => {
      mockProductionRepo.manager.query
        .mockResolvedValueOnce([])          // autoCloseStaleProductions: no production_settings → returns early
        .mockResolvedValueOnce([{ cnt: 1 }])
        .mockResolvedValueOnce([makeProductionRow({ item_count: 4 })]);

      const result = await service.fetchProductions({});

      const p = result.productions[0];
      expect(p.id).toBe(1);
      expect(p.name).toBe("Morning Run");
      expect(p.status).toBe(ProductionStatus.OPEN);
      expect((p as any).item_count).toBe(4);
    });

    it("applies status filter in WHERE clause", async () => {
      mockProductionRepo.manager.query
        .mockResolvedValueOnce([])          // autoCloseStaleProductions: no production_settings → returns early
        .mockResolvedValueOnce([{ cnt: 0 }])
        .mockResolvedValueOnce([]);

      await service.fetchProductions({ status: ProductionStatus.CLOSED });

      const countSql = String(mockProductionRepo.manager.query.mock.calls[1][0]);
      expect(countSql).toContain("p.status = ?");
      expect(mockProductionRepo.manager.query.mock.calls[1][1]).toContain(ProductionStatus.CLOSED);
    });

    it("applies start_date filter in WHERE clause", async () => {
      mockProductionRepo.manager.query
        .mockResolvedValueOnce([])          // autoCloseStaleProductions: no production_settings → returns early
        .mockResolvedValueOnce([{ cnt: 0 }])
        .mockResolvedValueOnce([]);

      const start = new Date("2024-04-01");
      await service.fetchProductions({ start_date: start });

      const countSql = String(mockProductionRepo.manager.query.mock.calls[1][0]);
      expect(countSql).toContain("p.created_at >= ?");
    });

    it("applies end_date filter and sets time to end of day", async () => {
      mockProductionRepo.manager.query
        .mockResolvedValueOnce([])          // autoCloseStaleProductions: no production_settings → returns early
        .mockResolvedValueOnce([{ cnt: 0 }])
        .mockResolvedValueOnce([]);

      const end = new Date("2024-04-30");
      await service.fetchProductions({ end_date: end });

      const countSql = String(mockProductionRepo.manager.query.mock.calls[1][0]);
      expect(countSql).toContain("p.created_at <= ?");
      const params = mockProductionRepo.manager.query.mock.calls[1][1] as string[];
      // setHours(23,59,59,999) in local time — ISO string ends in :59.999Z regardless of offset
      expect(params[0]).toMatch(/:59\.999Z$/);
    });

    it("uses default limit=100 and offset=0", async () => {
      mockProductionRepo.manager.query
        .mockResolvedValueOnce([])          // autoCloseStaleProductions: no production_settings → returns early
        .mockResolvedValueOnce([{ cnt: 0 }])
        .mockResolvedValueOnce([]);

      await service.fetchProductions({});

      const fetchParams = mockProductionRepo.manager.query.mock.calls[2][1] as unknown[];
      expect(fetchParams.at(-2)).toBe(100);
      expect(fetchParams.at(-1)).toBe(0);
    });

    it("uses provided limit and offset", async () => {
      mockProductionRepo.manager.query
        .mockResolvedValueOnce([])          // autoCloseStaleProductions: no production_settings → returns early
        .mockResolvedValueOnce([{ cnt: 0 }])
        .mockResolvedValueOnce([]);

      await service.fetchProductions({ limit: 10, offset: 20 });

      const fetchParams = mockProductionRepo.manager.query.mock.calls[2][1] as unknown[];
      expect(fetchParams.at(-2)).toBe(10);
      expect(fetchParams.at(-1)).toBe(20);
    });
  });

  // ─── fetchProductionById ──────────────────────────────────────────────────

  describe("fetchProductionById", () => {
    it("returns null when no row found", async () => {
      mockProductionRepo.manager.query.mockResolvedValue([]);

      const result = await service.fetchProductionById(999);

      expect(result).toBeNull();
    });

    it("returns a mapped Production with metadata", async () => {
      mockProductionRepo.manager.query.mockResolvedValue([makeDetailRow()]);

      const result = await service.fetchProductionById(1);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);
      expect(result!.name).toBe("Morning Run");
      expect(result!.description).toBe("First shift production");
      expect(result!.status).toBe(ProductionStatus.OPEN);
    });

    it("maps production items from joined rows", async () => {
      mockProductionRepo.manager.query.mockResolvedValue([makeDetailRow()]);

      const result = await service.fetchProductionById(1);

      expect(result!.items).toHaveLength(1);
      const item = result!.items[0];
      expect(item.id).toBe(10);
      expect(item.quantity_produced).toBe(5);
      expect(item.status).toBe(ProductionItemStatus.ISSUED);
    });

    it("maps item data from joined row", async () => {
      mockProductionRepo.manager.query.mockResolvedValue([makeDetailRow()]);

      const result = await service.fetchProductionById(1);

      const item = result!.items[0];
      expect(item.item.id).toBe(2);
      expect(item.item.name).toBe("Beef Stew");
    });

    it("maps user data from joined row", async () => {
      mockProductionRepo.manager.query.mockResolvedValue([makeDetailRow()]);

      const result = await service.fetchProductionById(1);

      const item = result!.items[0];
      expect(item.issued_by_user?.firstName).toBe("Alice");
      expect(item.issued_by_user?.username).toBe("alice");
    });

    it("returns empty items array when all rows have no pi_id", async () => {
      mockProductionRepo.manager.query.mockResolvedValue([
        makeDetailRow({ pi_id: null }),
      ]);

      const result = await service.fetchProductionById(1);

      expect(result!.items).toHaveLength(0);
    });

    it("returns multiple items when multiple rows share the same production_id", async () => {
      mockProductionRepo.manager.query.mockResolvedValue([
        makeDetailRow({ pi_id: 10, pi_item_id: 2 }),
        makeDetailRow({ pi_id: 11, pi_item_id: 3, it_id: 3, it_name: "Rice" }),
      ]);

      const result = await service.fetchProductionById(1);

      expect(result!.items).toHaveLength(2);
      expect(result!.items[1].item.name).toBe("Rice");
    });

    it("passes the id as a query parameter", async () => {
      mockProductionRepo.manager.query.mockResolvedValue([makeDetailRow()]);

      await service.fetchProductionById(42);

      expect(mockProductionRepo.manager.query.mock.calls[0][1]).toEqual([42]);
    });
  });
});

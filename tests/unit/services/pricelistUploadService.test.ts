import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockDataSource,
  createMockRepository,
} from "../mocks/createMockDataSource";

vi.mock("xlsx", () => ({
  read: vi.fn().mockReturnValue({
    SheetNames: ["Sheet1"],
    Sheets: {
      Sheet1: {},
    },
  }),
  utils: {
    sheet_to_json: vi.fn().mockReturnValue([
      ["code", "name", "category_code", "pricelist_code", "price"],
      ["BRG", "Burger", "FOOD", "STD", "800"],
    ]),
  },
}));

const mockPapaparse = vi.hoisted(() => ({
  parse: vi.fn().mockImplementation((csv: string, opts: any) => {
    opts.complete({
      data: [
        {
          code: "BRG",
          name: "Burger",
          category_code: "FOOD",
          pricelist_code: "STD",
          price: "800",
        },
      ],
    });
  }),
}));

vi.mock("papaparse", () => ({
  default: mockPapaparse,
}));

vi.mock("@backend/utils/logger", () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { PricelistUploadService } from "@backend/service/PricelistUploadService";

describe("PricelistUploadService", () => {
  let service: PricelistUploadService;
  let mockItemRepo: ReturnType<typeof createMockRepository>;
  let mockCategoryRepo: ReturnType<typeof createMockRepository>;
  let mockPricelistRepo: ReturnType<typeof createMockRepository>;
  let mockPricelistItemRepo: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockItemRepo = createMockRepository();
    mockCategoryRepo = createMockRepository();
    mockPricelistRepo = createMockRepository();
    mockPricelistItemRepo = createMockRepository();
    const mockDs = createMockDataSource({
      Item: mockItemRepo,
      Category: mockCategoryRepo,
      Pricelist: mockPricelistRepo,
      PricelistItem: mockPricelistItemRepo,
    });
    service = new PricelistUploadService(mockDs as any);
  });

  describe("parseUploadFile", () => {
    it("throws for unsupported file format", async () => {
      const buffer = Buffer.from("test");

      await expect(service.parseUploadFile(buffer, "data.txt")).rejects.toThrow(
        "Unsupported file format"
      );
    });

    it("parses a CSV file using papaparse", async () => {
      const buffer = Buffer.from("code,name,category_code,pricelist_code,price\nBRG,Burger,FOOD,STD,800");

      const result = await service.parseUploadFile(buffer, "menu.csv");

      expect(mockPapaparse.parse).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("BRG");
      expect(result[0].name).toBe("Burger");
    });

    it("parses an Excel file using xlsx", async () => {
      const { read, utils } = await import("xlsx");
      const buffer = Buffer.from("fake excel");

      const result = await service.parseUploadFile(buffer, "menu.xlsx");

      expect(read).toHaveBeenCalledWith(buffer, { type: "buffer" });
      expect(result).toHaveLength(1);
    });
  });

  describe("validateUploadData", () => {
    it("returns valid: false when required fields are missing", async () => {
      const rows = [
        {
          code: "",
          name: "Burger",
          category_code: "FOOD",
          pricelist_code: "STD",
          price: 800,
        },
      ];

      const result = await service.validateUploadData(rows as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Row 1: Missing required field 'code'");
    });

    it("returns valid: false when price is 0 or missing", async () => {
      const rows = [
        {
          code: "BRG",
          name: "Burger",
          category_code: "FOOD",
          pricelist_code: "STD",
          price: 0,
        },
      ];

      const result = await service.validateUploadData(rows as any);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("Price must be greater than 0"))).toBe(true);
    });

    it("proceeds to database validation when basic fields are present", async () => {
      const rows = [
        {
          code: "BRG",
          name: "Burger",
          category_code: "FOOD",
          pricelist_code: "STD",
          price: 800,
        },
      ];

      const categoryQb = mockCategoryRepo.createQueryBuilder();
      categoryQb.getMany.mockResolvedValue([{ id: 1, code: "FOOD", name: "Food" }]);

      const pricelistQb = mockPricelistRepo.createQueryBuilder();
      pricelistQb.getMany.mockResolvedValue([{ id: 1, code: "STD", name: "Standard" }]);

      const result = await service.validateUploadData(rows as any);

      expect(categoryQb.getMany).toHaveBeenCalled();
    });
  });
});

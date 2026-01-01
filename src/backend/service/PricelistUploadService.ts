import { DataSource, Repository, In } from "typeorm";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Item, ItemStatus } from "@entities/Item";
import { Category, CategoryStatus } from "@entities/Category";
import { Pricelist } from "@entities/Pricelist";
import { PricelistItem, Currency } from "@entities/PricelistItem";
import logger from "@backend/utils/logger";
import { cache } from "@backend/utils/cache";
import { ItemService } from "./ItemService";
import { CategoryService } from "./CategoryService";
import { PricelistService } from "./PricelistService";

export interface UploadRow {
  code: string;
  name: string;
  category_code: string;
  category_name?: string;
  pricelist_code: string;
  price: number;
  currency?: string;
  is_stock?: boolean;
  allow_negative_inventory?: boolean;
  is_enabled?: boolean;
}

export interface MatchedItem {
  item: Item | null;
  confidence: number;
  matchType: "exact_code" | "name_category" | "fuzzy_name" | "none";
}

export interface UploadValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  rows: UploadRow[];
  matchedItems: Map<number, MatchedItem>;
  matchedCategories: Map<string, Category>;
  matchedPricelists: Map<string, Pricelist>;
}

export interface UploadProcessResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export class PricelistUploadService {
  private itemRepository: Repository<Item>;
  private categoryRepository: Repository<Category>;
  private pricelistRepository: Repository<Pricelist>;
  private pricelistItemRepository: Repository<PricelistItem>;
  private itemService: ItemService;
  private categoryService: CategoryService;
  private pricelistService: PricelistService;

  constructor(datasource: DataSource) {
    this.itemRepository = datasource.getRepository(Item);
    this.categoryRepository = datasource.getRepository(Category);
    this.pricelistRepository = datasource.getRepository(Pricelist);
    this.pricelistItemRepository = datasource.getRepository(PricelistItem);
    this.itemService = new ItemService(datasource);
    this.categoryService = new CategoryService(datasource);
    this.pricelistService = new PricelistService(datasource);
  }

  /**
   * Parse uploaded file (CSV, XLS, XLSX)
   */
  public async parseUploadFile(
    fileBuffer: Buffer,
    filename: string
  ): Promise<UploadRow[]> {
    const extension = filename.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
      return this.parseCSV(fileBuffer);
    } else if (extension === "xls" || extension === "xlsx") {
      return this.parseExcel(fileBuffer);
    } else {
      throw new Error(`Unsupported file format: ${extension}`);
    }
  }

  /**
   * Parse CSV file
   */
  private async parseCSV(fileBuffer: Buffer): Promise<UploadRow[]> {
    return new Promise((resolve, reject) => {
      const csvString = fileBuffer.toString("utf-8");
      Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => {
          // Normalize header names (case-insensitive, handle spaces/underscores)
          return header.trim().toLowerCase().replace(/\s+/g, "_");
        },
        complete: (results) => {
          try {
            const rows = this.normalizeRows(results.data as any[]);
            resolve(rows);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  }

  /**
   * Parse Excel file (XLS, XLSX)
   */
  private async parseExcel(fileBuffer: Buffer): Promise<UploadRow[]> {
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length < 2) {
      throw new Error("Excel file must have at least a header row and one data row");
    }

    // First row is headers
    const headers = (data[0] as string[]).map((h) =>
      h.trim().toLowerCase().replace(/\s+/g, "_")
    );
    const rows = data.slice(1).map((row: any) => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] !== undefined ? String(row[index]).trim() : "";
      });
      return obj;
    });

    return this.normalizeRows(rows);
  }

  /**
   * Normalize and validate rows
   */
  private normalizeRows(rows: any[]): UploadRow[] {
    return rows
      .map((row, index) => {
        try {
          const normalized: UploadRow = {
            code: String(row.code || row.item_code || "").trim(),
            name: String(row.name || row.item_name || "").trim(),
            category_code: String(row.category_code || "").trim(),
            category_name: row.category_name ? String(row.category_name).trim() : undefined,
            pricelist_code: String(row.pricelist_code || "").trim(),
            price: parseFloat(row.price || row.item_price || "0") || 0,
            currency: row.currency ? String(row.currency).trim().toUpperCase() : undefined,
            is_stock: this.parseBoolean(row.is_stock, false),
            allow_negative_inventory: this.parseBoolean(row.allow_negative_inventory, false),
            is_enabled: this.parseBoolean(row.is_enabled, true),
          };

          // Only return valid rows (must have code and name)
          if (normalized.code && normalized.name) {
            return normalized;
          }
          return null;
        } catch (error) {
          logger.warn({ row, index, error }, "Failed to normalize row");
          return null;
        }
      })
      .filter((row): row is UploadRow => row !== null);
  }

  /**
   * Parse boolean value from various formats
   */
  private parseBoolean(value: any, defaultValue: boolean): boolean {
    if (value === undefined || value === null || value === "") {
      return defaultValue;
    }
    if (typeof value === "boolean") {
      return value;
    }
    const str = String(value).toLowerCase().trim();
    return str === "true" || str === "1" || str === "yes" || str === "y";
  }

  /**
   * Validate upload data
   */
  public async validateUploadData(
    rows: UploadRow[]
  ): Promise<UploadValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const matchedItems = new Map<number, MatchedItem>();
    const matchedCategories = new Map<string, Category>();
    const matchedPricelists = new Map<string, Pricelist>();

    // Validate required fields
    rows.forEach((row, index) => {
      if (!row.code) {
        errors.push(`Row ${index + 1}: Missing required field 'code'`);
      }
      if (!row.name) {
        errors.push(`Row ${index + 1}: Missing required field 'name'`);
      }
      if (!row.category_code) {
        errors.push(`Row ${index + 1}: Missing required field 'category_code'`);
      }
      if (!row.pricelist_code) {
        errors.push(`Row ${index + 1}: Missing required field 'pricelist_code'`);
      }
      if (!row.price || row.price <= 0) {
        errors.push(`Row ${index + 1}: Invalid or missing price`);
      }
    });

    if (errors.length > 0) {
      return {
        valid: false,
        errors,
        warnings,
        rows,
        matchedItems,
        matchedCategories,
        matchedPricelists,
      };
    }

    // Load only needed categories and pricelists (by code) - more efficient with caching
    const categoryCodes = [...new Set(rows.map(r => r.category_code.toLowerCase()).filter(Boolean))];
    const pricelistCodes = [...new Set(rows.map(r => r.pricelist_code.toLowerCase()).filter(Boolean))];

    // Try cache first for categories and pricelists
    const categoriesCacheKey = `categories_by_codes_${categoryCodes.sort().join(",")}`;
    const pricelistsCacheKey = `pricelists_by_codes_${pricelistCodes.sort().join(",")}`;

    let categories = cache.get<Category[]>(categoriesCacheKey);
    let pricelists = cache.get<Pricelist[]>(pricelistsCacheKey);

    if (!categories || !pricelists) {
      // Build optimized queries
      const categoriesQuery = this.categoryRepository
        .createQueryBuilder("category")
        .where("category.status = :status", { status: CategoryStatus.ACTIVE });

      if (categoryCodes.length > 0) {
        categoriesQuery.andWhere("LOWER(category.code) IN (:...codes)", { codes: categoryCodes });
      }

      const pricelistsQuery = this.pricelistRepository.createQueryBuilder("pricelist");
      if (pricelistCodes.length > 0) {
        pricelistsQuery.where("LOWER(pricelist.code) IN (:...codes)", { codes: pricelistCodes });
      }

      const [fetchedCategories, fetchedPricelists] = await Promise.all([
        categoriesQuery.getMany(),
        pricelistsQuery.getMany(),
      ]);

      if (!categories) {
        categories = fetchedCategories;
        cache.set(categoriesCacheKey, categories, 60000); // Cache for 60 seconds
      }

      if (!pricelists) {
        pricelists = fetchedPricelists;
        cache.set(pricelistsCacheKey, pricelists, 60000); // Cache for 60 seconds
      }
    }

    // Match categories by code
    const categoryCodeMap = new Map<string, Category>();
    categories.forEach((cat) => {
      if (cat.code) {
        categoryCodeMap.set(cat.code.toLowerCase(), cat);
      }
    });

    // Match pricelists by code
    const pricelistCodeMap = new Map<string, Pricelist>();
    pricelists.forEach((pl) => {
      if (pl.code) {
        pricelistCodeMap.set(pl.code.toLowerCase(), pl);
      }
    });

    // Match categories and pricelists for each row
    rows.forEach((row, index) => {
      const categoryCode = row.category_code.toLowerCase();
      const category = categoryCodeMap.get(categoryCode);
      if (category) {
        matchedCategories.set(categoryCode, category);
      } else {
        errors.push(`Row ${index + 1}: Category code '${row.category_code}' not found`);
      }

      const pricelistCode = row.pricelist_code.toLowerCase();
      const pricelist = pricelistCodeMap.get(pricelistCode);
      if (pricelist) {
        matchedPricelists.set(pricelistCode, pricelist);
      } else {
        errors.push(`Row ${index + 1}: Pricelist code '${row.pricelist_code}' not found`);
      }
    });

    // Load only items that might match (by code or name) - much more efficient with caching
    const itemCodes = rows.map(r => r.code.toLowerCase()).filter(Boolean);
    const itemNames = rows.map(r => r.name.toLowerCase()).filter(Boolean);

    // Use cache for items lookup if we have codes
    const itemsCacheKey = itemCodes.length > 0
      ? `items_by_codes_${itemCodes.sort().slice(0, 50).join(",")}` // Limit cache key length
      : null;

    let allItems = itemsCacheKey ? cache.get<Item[]>(itemsCacheKey) : null;

    if (!allItems) {
      // Build query to fetch only potentially matching items
      const itemsQuery = this.itemRepository
        .createQueryBuilder("item")
        .leftJoinAndSelect("item.category", "category")
        .select([
          "item.id",
          "item.name",
          "item.code",
          "category.id",
          "category.name",
          "category.code"
        ]);

      // Add conditions to filter items - prioritize code matches (more efficient)
      if (itemCodes.length > 0) {
        itemsQuery.where("LOWER(item.code) IN (:...codes)", { codes: itemCodes });
      } else if (itemNames.length > 0) {
        // Only use name matching if no codes provided (less efficient)
        itemsQuery.where("LOWER(item.name) IN (:...names)", { names: itemNames.slice(0, 100) }); // Limit to prevent huge queries
      }

      allItems = await itemsQuery.getMany();

      // Cache for 60 seconds
      if (itemsCacheKey && allItems.length < 1000) { // Only cache reasonable result sets
        cache.set(itemsCacheKey, allItems, 60000);
      }
    }

    // Match items using smart matching
    rows.forEach((row, index) => {
      const match = this.findMatchingItem(row, allItems);
      matchedItems.set(index, match);

      if (match.matchType === "none") {
        warnings.push(`Row ${index + 1}: No matching item found for code '${row.code}' - will create new item`);
      } else if (match.confidence < 70) {
        warnings.push(`Row ${index + 1}: Low confidence match (${match.confidence}%) for code '${row.code}'`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      rows,
      matchedItems,
      matchedCategories,
      matchedPricelists,
    };
  }

  /**
   * Find matching item using smart matching algorithm
   */
  private findMatchingItem(row: UploadRow, allItems: Item[]): MatchedItem {
    // 1. Exact code match (highest priority)
    const exactCodeMatch = allItems.find(
      (item) => item.code.toLowerCase() === row.code.toLowerCase()
    );
    if (exactCodeMatch) {
      return {
        item: exactCodeMatch,
        confidence: 100,
        matchType: "exact_code",
      };
    }

    // 2. Name + Category match
    const categoryMatch = allItems.find((item) => {
      const categoryCode = item.category?.code?.toLowerCase();
      return (
        item.name.toLowerCase() === row.name.toLowerCase() &&
        categoryCode === row.category_code.toLowerCase()
      );
    });
    if (categoryMatch) {
      return {
        item: categoryMatch,
        confidence: 85,
        matchType: "name_category",
      };
    }

    // 3. Fuzzy name match (simple Levenshtein-like)
    let bestFuzzyMatch: Item | null = null;
    let bestFuzzyScore = 0;
    const rowNameLower = row.name.toLowerCase();

    allItems.forEach((item) => {
      const itemNameLower = item.name.toLowerCase();
      const similarity = this.calculateSimilarity(rowNameLower, itemNameLower);
      if (similarity > bestFuzzyScore && similarity >= 0.7) {
        bestFuzzyScore = similarity;
        bestFuzzyMatch = item;
      }
    });

    if (bestFuzzyMatch) {
      return {
        item: bestFuzzyMatch,
        confidence: Math.round(bestFuzzyScore * 100),
        matchType: "fuzzy_name",
      };
    }

    // 4. No match
    return {
      item: null,
      confidence: 0,
      matchType: "none",
    };
  }

  /**
   * Calculate string similarity (simple implementation)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Process upload with user confirmations
   */
  public async processUpload(
    validationResult: UploadValidationResult,
    userConfirmations: Map<number, "create" | "update" | "skip">,
    userId: number
  ): Promise<UploadProcessResult> {
    const result: UploadProcessResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < validationResult.rows.length; i++) {
      const row = validationResult.rows[i];
      const match = validationResult.matchedItems.get(i);
      const category = validationResult.matchedCategories.get(row.category_code.toLowerCase());
      const pricelist = validationResult.matchedPricelists.get(row.pricelist_code.toLowerCase());

      if (!category || !pricelist) {
        result.errors.push(`Row ${i + 1}: Missing category or pricelist`);
        result.skipped++;
        continue;
      }

      const action = userConfirmations.get(i) || "skip";
      if (action === "skip") {
        result.skipped++;
        continue;
      }

      try {
        if (action === "create" || (action === "update" && !match?.item)) {
          // Create new item
          await this.itemService.createItem(
            {
              name: row.name,
              code: row.code,
              category: category,
              isStock: row.is_stock || false,
              allowNegativeInventory: row.allow_negative_inventory || false,
            },
            { pricelistId: pricelist.id, price: row.price },
            userId
          );
          result.created++;
        } else if (action === "update" && match?.item) {
          // Update existing item
          const pricelistItem = await this.pricelistItemRepository.findOne({
            where: {
              item: { id: match.item.id },
              pricelist: { id: pricelist.id },
            },
          });

          // Update item fields
          await this.itemService.updateItem(
            {
              id: match.item.id,
              name: row.name,
              code: row.code,
              category: category,
              isStock: row.is_stock !== undefined ? row.is_stock : match.item.isStock,
              allowNegativeInventory:
                row.allow_negative_inventory !== undefined
                  ? row.allow_negative_inventory
                  : match.item.allowNegativeInventory,
            },
            {
              pricelistItemId: pricelistItem?.id,
              price: row.price,
            },
            userId,
            pricelist.id
          );

          // Update currency and is_enabled if pricelist item exists
          if (pricelistItem) {
            if (row.currency && pricelistItem.currency !== row.currency) {
              pricelistItem.currency = row.currency as Currency;
            }
            if (row.is_enabled !== undefined && pricelistItem.is_enabled !== row.is_enabled) {
              pricelistItem.is_enabled = row.is_enabled;
            }
            pricelistItem.updated_by = userId;
            await this.pricelistItemRepository.save(pricelistItem);
          }

          result.updated++;
        }
      } catch (error) {
        const errorMsg = `Row ${i + 1}: ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errorMsg);
        logger.error({ row, error }, "Failed to process upload row");
      }
    }

    return result;
  }
}


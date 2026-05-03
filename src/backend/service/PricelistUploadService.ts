import { DataSource, Repository } from "typeorm";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Item, ItemStatus } from "@entities/Item";
import { Category, CategoryStatus } from "@entities/Category";
import { Pricelist } from "@entities/Pricelist";
import { PricelistItem, Currency } from "@entities/PricelistItem";
import { Inventory } from "@entities/Inventory";
import logger from "@backend/utils/logger";
import { cache } from "@backend/utils/cache";

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

export interface RowMatchInfo {
  itemId: number | null;
  itemCode: string | null;
  itemName: string | null;
  confidence: number;
  matchType: "exact_code" | "name_category" | "fuzzy_name" | "none";
}

export interface UploadValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  rows: UploadRow[];
  rowMatches: RowMatchInfo[]; // index-aligned with rows; replaces the old Map<number, MatchedItem>
}

export interface RowConfirmation {
  action: "create" | "update" | "skip";
  matchedItemId?: number | null;
}

export interface UploadProcessResult {
  created: number;
  updated: number;
  skipped: number;
}

export class PricelistUploadService {
  private dataSource: DataSource;
  private itemRepository: Repository<Item>;
  private categoryRepository: Repository<Category>;
  private pricelistRepository: Repository<Pricelist>;
  private pricelistItemRepository: Repository<PricelistItem>;

  constructor(datasource: DataSource) {
    this.dataSource = datasource;
    this.itemRepository = datasource.getRepository(Item);
    this.categoryRepository = datasource.getRepository(Category);
    this.pricelistRepository = datasource.getRepository(Pricelist);
    this.pricelistItemRepository = datasource.getRepository(PricelistItem);
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
    const rowMatches: RowMatchInfo[] = [];

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
        errors.push(`Row ${index + 1}: Price must be greater than 0`);
      }
    });

    if (errors.length > 0) {
      rows.forEach(() => rowMatches.push({ itemId: null, itemCode: null, itemName: null, confidence: 0, matchType: "none" }));
      return { valid: false, errors, warnings, rows, rowMatches };
    }

    // Load categories and pricelists referenced in the upload
    const categoryCodes = [...new Set(rows.map(r => r.category_code.toLowerCase()).filter(Boolean))];
    const pricelistCodes = [...new Set(rows.map(r => r.pricelist_code.toLowerCase()).filter(Boolean))];

    const categoriesCacheKey = `categories_by_codes_${categoryCodes.sort().join(",")}`;
    const pricelistsCacheKey = `pricelists_by_codes_${pricelistCodes.sort().join(",")}`;

    let categories = cache.get<Category[]>(categoriesCacheKey);
    let pricelists = cache.get<Pricelist[]>(pricelistsCacheKey);

    if (!categories || !pricelists) {
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
        cache.set(categoriesCacheKey, categories, 60000);
      }

      if (!pricelists) {
        pricelists = fetchedPricelists;
        cache.set(pricelistsCacheKey, pricelists, 60000);
      }
    }

    const categoryCodeMap = new Map<string, Category>();
    categories.forEach((cat) => {
      if (cat.code) categoryCodeMap.set(cat.code.toLowerCase(), cat);
    });

    const pricelistCodeMap = new Map<string, Pricelist>();
    pricelists.forEach((pl) => {
      if (pl.code) pricelistCodeMap.set(pl.code.toLowerCase(), pl);
    });

    // Validate category and pricelist existence per row
    rows.forEach((row, index) => {
      if (!categoryCodeMap.has(row.category_code.toLowerCase())) {
        errors.push(`Row ${index + 1}: Category code '${row.category_code}' not found or inactive`);
      }
      if (!pricelistCodeMap.has(row.pricelist_code.toLowerCase())) {
        errors.push(`Row ${index + 1}: Pricelist code '${row.pricelist_code}' not found`);
      }
    });

    // Load potentially matching items
    const itemCodes = rows.map(r => r.code.toLowerCase()).filter(Boolean);
    const itemNames = rows.map(r => r.name.toLowerCase()).filter(Boolean);

    const itemsCacheKey = itemCodes.length > 0
      ? `items_by_codes_${itemCodes.sort().slice(0, 50).join(",")}`
      : null;

    let allItems = itemsCacheKey ? cache.get<Item[]>(itemsCacheKey) : null;

    if (!allItems) {
      const itemsQuery = this.itemRepository
        .createQueryBuilder("item")
        .leftJoinAndSelect("item.category", "category")
        .select([
          "item.id",
          "item.name",
          "item.code",
          "category.id",
          "category.name",
          "category.code",
        ]);

      if (itemCodes.length > 0) {
        itemsQuery.where("LOWER(item.code) IN (:...codes)", { codes: itemCodes });
      } else if (itemNames.length > 0) {
        itemsQuery.where("LOWER(item.name) IN (:...names)", { names: itemNames.slice(0, 100) });
      }

      allItems = await itemsQuery.getMany();

      if (itemsCacheKey && allItems.length < 1000) {
        cache.set(itemsCacheKey, allItems, 60000);
      }
    }

    // Build row match results
    rows.forEach((row, index) => {
      const match = this.findMatchingItem(row, allItems!);
      rowMatches.push({
        itemId: match.item?.id ?? null,
        itemCode: match.item?.code ?? null,
        itemName: match.item?.name ?? null,
        confidence: match.confidence,
        matchType: match.matchType,
      });

      if (match.matchType === "none") {
        warnings.push(`Row ${index + 1}: No matching item for code '${row.code}' — will create new item`);
      } else if (match.confidence < 70) {
        warnings.push(`Row ${index + 1}: Low confidence match (${match.confidence}%) for '${row.code}'`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      rows,
      rowMatches,
    };
  }

  /**
   * Find matching item using smart matching algorithm
   */
  private findMatchingItem(row: UploadRow, allItems: Item[]): { item: Item | null; confidence: number; matchType: RowMatchInfo["matchType"] } {
    const exactCodeMatch = allItems.find(
      (item) => item.code.toLowerCase() === row.code.toLowerCase()
    );
    if (exactCodeMatch) {
      return { item: exactCodeMatch, confidence: 100, matchType: "exact_code" };
    }

    const categoryMatch = allItems.find((item) => {
      const categoryCode = item.category?.code?.toLowerCase();
      return (
        item.name.toLowerCase() === row.name.toLowerCase() &&
        categoryCode === row.category_code.toLowerCase()
      );
    });
    if (categoryMatch) {
      return { item: categoryMatch, confidence: 85, matchType: "name_category" };
    }

    let bestFuzzyMatch: Item | null = null;
    let bestFuzzyScore = 0;
    const rowNameLower = row.name.toLowerCase();

    allItems.forEach((item) => {
      const similarity = this.calculateSimilarity(rowNameLower, item.name.toLowerCase());
      if (similarity > bestFuzzyScore && similarity >= 0.7) {
        bestFuzzyScore = similarity;
        bestFuzzyMatch = item;
      }
    });

    if (bestFuzzyMatch) {
      return { item: bestFuzzyMatch, confidence: Math.round(bestFuzzyScore * 100), matchType: "fuzzy_name" };
    }

    return { item: null, confidence: 0, matchType: "none" };
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
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
   * Process upload atomically — all rows succeed or nothing is saved.
   * Bypasses the per-service transaction wrappers and uses a single QueryRunner.
   */
  public async processUpload(
    rows: UploadRow[],
    confirmations: Map<number, RowConfirmation>,
    userId: number
  ): Promise<UploadProcessResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Re-fetch categories and pricelists fresh inside the transaction
      const categoryCodes = [...new Set(rows.map(r => r.category_code.toLowerCase()))];
      const pricelistCodes = [...new Set(rows.map(r => r.pricelist_code.toLowerCase()))];

      const [categories, pricelists] = await Promise.all([
        queryRunner.manager
          .createQueryBuilder(Category, "c")
          .where("LOWER(c.code) IN (:...codes)", { codes: categoryCodes })
          .getMany(),
        queryRunner.manager
          .createQueryBuilder(Pricelist, "p")
          .where("LOWER(p.code) IN (:...codes)", { codes: pricelistCodes })
          .getMany(),
      ]);

      const categoryMap = new Map(categories.map(c => [c.code!.toLowerCase(), c]));
      const pricelistMap = new Map(pricelists.map(p => [p.code!.toLowerCase(), p]));

      const result: UploadProcessResult = { created: 0, updated: 0, skipped: 0 };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const confirmation = confirmations.get(i) ?? { action: "skip" };
        const { action, matchedItemId } = confirmation;

        if (action === "skip") {
          result.skipped++;
          continue;
        }

        const category = categoryMap.get(row.category_code.toLowerCase());
        const pricelist = pricelistMap.get(row.pricelist_code.toLowerCase());

        if (!category) {
          throw new Error(`Row ${i + 1}: category '${row.category_code}' not found or inactive`);
        }
        if (!pricelist) {
          throw new Error(`Row ${i + 1}: pricelist '${row.pricelist_code}' not found`);
        }

        if (action === "create" || (action === "update" && !matchedItemId)) {
          // Create new Item
          const item = queryRunner.manager.create(Item, {
            name: row.name,
            code: row.code,
            category: category,
            isStock: row.is_stock ?? false,
            allowNegativeInventory: row.allow_negative_inventory ?? false,
            status: ItemStatus.ACTIVE,
            created_by: userId,
          });
          const savedItem = await queryRunner.manager.save(Item, item);

          // Create PricelistItem
          const pricelistItem = queryRunner.manager.create(PricelistItem, {
            item: savedItem,
            pricelist: pricelist,
            price: row.price,
            currency: (row.currency as Currency) ?? Currency.KES,
            is_enabled: row.is_enabled ?? true,
            created_by: userId,
          });
          await queryRunner.manager.save(PricelistItem, pricelistItem);

          // Create inventory record for stock items
          if (row.is_stock) {
            const inv = queryRunner.manager.create(Inventory, {
              item: savedItem,
              quantity: 0,
              created_by: userId,
            });
            await queryRunner.manager.save(Inventory, inv);
          }

          result.created++;
        } else if (action === "update" && matchedItemId) {
          // Update existing Item
          const existingItem = await queryRunner.manager.findOne(Item, {
            where: { id: matchedItemId },
          });
          if (!existingItem) {
            throw new Error(`Row ${i + 1}: item with id ${matchedItemId} not found`);
          }

          await queryRunner.manager.save(Item, {
            ...existingItem,
            name: row.name,
            code: row.code,
            category: category,
            isStock: row.is_stock ?? existingItem.isStock,
            allowNegativeInventory: row.allow_negative_inventory ?? existingItem.allowNegativeInventory,
            updated_by: userId,
          });

          // Update or create PricelistItem
          const existingPricelistItem = await queryRunner.manager.findOne(PricelistItem, {
            where: { item: { id: matchedItemId }, pricelist: { id: pricelist.id } },
          });

          if (existingPricelistItem) {
            existingPricelistItem.price = row.price;
            if (row.currency) existingPricelistItem.currency = row.currency as Currency;
            if (row.is_enabled !== undefined) existingPricelistItem.is_enabled = row.is_enabled;
            existingPricelistItem.updated_by = userId;
            await queryRunner.manager.save(PricelistItem, existingPricelistItem);
          } else {
            const newPricelistItem = queryRunner.manager.create(PricelistItem, {
              item: { id: matchedItemId },
              pricelist: pricelist,
              price: row.price,
              currency: (row.currency as Currency) ?? Currency.KES,
              is_enabled: row.is_enabled ?? true,
              created_by: userId,
            });
            await queryRunner.manager.save(PricelistItem, newPricelistItem);
          }

          result.updated++;
        }
      }

      await queryRunner.commitTransaction();

      // Invalidate caches after commit
      cache.invalidate("items");
      pricelists.forEach(pl => cache.invalidate(`pricelist_items_${pl.id}`));

      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error({ error }, "Pricelist upload rolled back due to error");
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Fetch a pricelist by ID (used for template generation)
   */
  public async getPricelist(id: number): Promise<Pricelist | null> {
    return this.pricelistRepository.findOne({ where: { id } });
  }

  /**
   * Generate a CSV template pre-filled with the pricelist code
   */
  public generateTemplate(pricelistCode: string): string {
    const headers = [
      "code",
      "name",
      "category_code",
      "category_name",
      "pricelist_code",
      "price",
      "currency",
      "is_stock",
      "allow_negative_inventory",
      "is_enabled",
    ].join(",");

    const example1 = [
      "ITEM001",
      "Example Item 1",
      "CATEGORY_CODE",
      "Category Name",
      pricelistCode,
      "500",
      "KES",
      "false",
      "false",
      "true",
    ].join(",");

    const example2 = [
      "ITEM002",
      "Example Item 2",
      "CATEGORY_CODE",
      "Category Name",
      pricelistCode,
      "250",
      "KES",
      "true",
      "false",
      "true",
    ].join(",");

    return [headers, example1, example2].join("\n");
  }
}

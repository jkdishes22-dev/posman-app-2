import { DataSource, Repository, In } from "typeorm";
import { PricelistItemAudit } from "@backend/entities/PricelistItemAudit";
import { ItemAudit } from "@backend/entities/ItemAudit";
import { PricelistItem } from "@entities/PricelistItem";
import logger from "@backend/utils/logger";

export class AuditService {
  private pricelistItemAuditRepository: Repository<PricelistItemAudit>;
  private itemAuditRepository: Repository<ItemAudit>;
  private pricelistItemRepository: Repository<PricelistItem>;

  constructor(datasource: DataSource) {
    this.pricelistItemAuditRepository = datasource.getRepository(PricelistItemAudit);
    this.itemAuditRepository = datasource.getRepository(ItemAudit);
    this.pricelistItemRepository = datasource.getRepository(PricelistItem);
  }

  /**
   * Log a change to a PricelistItem
   */
  public async logPricelistItemChange(
    pricelistItemId: number,
    fieldName: string,
    oldValue: any,
    newValue: any,
    changedBy: number,
    changeReason?: string
  ): Promise<void> {
    try {
      const auditLog = this.pricelistItemAuditRepository.create({
        pricelist_item_id: pricelistItemId,
        field_name: fieldName,
        old_value: oldValue !== null && oldValue !== undefined ? String(oldValue) : null,
        new_value: newValue !== null && newValue !== undefined ? String(newValue) : null,
        changed_by: changedBy,
        change_reason: changeReason || null,
      });

      await this.pricelistItemAuditRepository.save(auditLog);
    } catch (error) {
      logger.error(
        {
          pricelistItemId,
          fieldName,
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to log pricelist item change"
      );
      // Don't throw - audit logging should not break the main operation
    }
  }

  /**
   * Log a change to an Item
   */
  public async logItemChange(
    itemId: number,
    fieldName: string,
    oldValue: any,
    newValue: any,
    changedBy: number,
    changeReason?: string
  ): Promise<void> {
    try {
      const auditLog = this.itemAuditRepository.create({
        item_id: itemId,
        field_name: fieldName,
        old_value: oldValue !== null && oldValue !== undefined ? String(oldValue) : null,
        new_value: newValue !== null && newValue !== undefined ? String(newValue) : null,
        changed_by: changedBy,
        change_reason: changeReason || null,
      });

      await this.itemAuditRepository.save(auditLog);
    } catch (error) {
      logger.error(
        {
          itemId,
          fieldName,
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to log item change"
      );
      // Don't throw - audit logging should not break the main operation
    }
  }

  /**
   * Get audit logs for a pricelist item
   */
  public async getPricelistItemAuditLog(
    pricelistItemId: number,
    limit: number = 100
  ): Promise<PricelistItemAudit[]> {
    try {
      // Skip table check - assume tables exist after migrations are run
      return await this.pricelistItemAuditRepository.find({
        where: { pricelist_item_id: pricelistItemId },
        relations: ["changed_by_user"],
        order: { changed_at: "DESC" },
        take: limit,
      });
    } catch (error) {
      // If table doesn't exist, return empty array instead of throwing
      if (error instanceof Error && error.message.includes("doesn't exist")) {
        logger.warn({ pricelistItemId }, "Audit table does not exist yet. Please run migrations.");
        return [];
      }
      logger.error(
        {
          pricelistItemId,
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to get pricelist item audit log"
      );
      throw error;
    }
  }

  /**
   * Get audit logs for an item
   */
  public async getItemAuditLog(
    itemId: number,
    limit: number = 100
  ): Promise<ItemAudit[]> {
    try {
      // Skip table check - assume tables exist after migrations are run
      return await this.itemAuditRepository.find({
        where: { item_id: itemId },
        relations: ["changed_by_user"],
        order: { changed_at: "DESC" },
        take: limit,
      });
    } catch (error) {
      // If table doesn't exist, return empty array instead of throwing
      if (error instanceof Error && error.message.includes("doesn't exist")) {
        logger.warn({ itemId }, "Audit table does not exist yet. Please run migrations.");
        return [];
      }
      logger.error(
        {
          itemId,
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to get item audit log"
      );
      throw error;
    }
  }

  /**
   * Get all audit logs for items in a pricelist
   */
  public async getPricelistAuditLog(
    pricelistId: number,
    limit: number = 500
  ): Promise<{
    pricelistItemAudits: PricelistItemAudit[];
    itemAudits: ItemAudit[];
  }> {
    try {
      // Skip table check - assume tables exist after migrations are run
      // This INFORMATION_SCHEMA query was causing performance issues
      // Get all pricelist items for this pricelist - optimized query without full relations
      const pricelistItemsRaw = await this.pricelistItemRepository
        .createQueryBuilder("pi")
        .select(["pi.id", "pi.item_id"])
        .where("pi.pricelist_id = :pricelistId", { pricelistId })
        .getRawMany();

      const pricelistItemIds = pricelistItemsRaw.map((pi: any) => pi.pi_id).filter((id: any) => id != null);
      const itemIds = pricelistItemsRaw
        .map((pi: any) => pi.pi_item_id)
        .filter((id: any): id is number => id != null);

      // Get all pricelist item audits for this pricelist
      let pricelistItemAudits: PricelistItemAudit[] = [];
      if (pricelistItemIds.length > 0) {
        pricelistItemAudits = await this.pricelistItemAuditRepository.find({
          where: { pricelist_item_id: In(pricelistItemIds) },
          relations: ["changed_by_user"],
          order: { changed_at: "DESC" },
          take: limit,
        });
      }

      // Get item audits for items in this pricelist
      let itemAudits: ItemAudit[] = [];
      if (itemIds.length > 0) {
        itemAudits = await this.itemAuditRepository.find({
          where: { item_id: In(itemIds) },
          relations: ["changed_by_user"],
          order: { changed_at: "DESC" },
          take: limit,
        });
      }

      return {
        pricelistItemAudits,
        itemAudits,
      };
    } catch (error) {
      logger.error(
        {
          pricelistId,
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to get pricelist audit log"
      );
      throw error;
    }
  }
}


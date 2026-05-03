import { Item } from "@backend/entities/Item";
import { User } from "@backend/entities/User";
import { ItemStatus } from "@backend/entities/Item";

/** Hydrate `BaseEntity` timestamps (fields are `readonly` on the class for ORM metadata). */
export function assignBaseEntityDates(entity: object, created_at: unknown, updated_at: unknown): void {
  const e = entity as { created_at?: Date; updated_at?: Date };
  if (created_at != null) e.created_at = created_at as Date;
  if (updated_at != null) e.updated_at = updated_at as Date;
}

/**
 * Map raw SQL row columns `{prefix}_id`, `{prefix}_name`, … to an Item (joined row pattern).
 */
export function mapItemRowWithPrefix(row: Record<string, unknown>, prefix: string): Item {
  const item = new Item();
  item.id = Number(row[`${prefix}_id`]);
  item.name = String(row[`${prefix}_name`] ?? "");
  item.code = String(row[`${prefix}_code`] ?? "");
  item.status = String(row[`${prefix}_status`] ?? ItemStatus.ACTIVE);
  if (row[`${prefix}_category_id`] != null) {
    item.category = { id: Number(row[`${prefix}_category_id`]) } as Item["category"];
  }
  if (row[`${prefix}_default_unit_id`] != null) {
    item.defaultUnitId = Number(row[`${prefix}_default_unit_id`]);
  }
  item.isGroup = Boolean(Number(row[`${prefix}_is_group`] ?? 0));
  item.isStock = Boolean(Number(row[`${prefix}_is_stock`] ?? 0));
  item.allowNegativeInventory = Boolean(Number(row[`${prefix}_allow_negative_inventory`] ?? 0));
  assignBaseEntityDates(
    item,
    row[`${prefix}_created_at`],
    row[`${prefix}_updated_at`],
  );
  if (row[`${prefix}_created_by`] != null) item.created_by = Number(row[`${prefix}_created_by`]);
  if (row[`${prefix}_updated_by`] != null) item.updated_by = Number(row[`${prefix}_updated_by`]);
  return item;
}

/** `{prefix}_id`, `{prefix}_firstName`, `{prefix}_lastName`, `{prefix}_username` */
export function mapUserRowWithPrefix(row: Record<string, unknown>, prefix: string): User | null {
  const id = row[`${prefix}_id`];
  if (id == null || id === "") return null;
  const u = new User();
  u.id = Number(id);
  u.firstName = String(row[`${prefix}_firstName`] ?? "");
  u.lastName = String(row[`${prefix}_lastName`] ?? "");
  u.username = String(row[`${prefix}_username`] ?? "");
  return u;
}

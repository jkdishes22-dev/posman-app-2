import { DataSource } from "typeorm";

function isMySql(ds: DataSource): boolean {
  return (ds.options as { type?: string }).type === "mysql";
}

/**
 * Returns a SELECT for system_settings compatible with the active DB engine.
 * MySQL requires `key` to be backtick-quoted (reserved word); SQLite does not.
 */
export function sysSettingsSelectSql(ds: DataSource): string {
  if (isMySql(ds)) {
    return "SELECT value FROM system_settings WHERE `key` = ?";
  }
  return "SELECT value FROM system_settings WHERE key = ?";
}

/**
 * Returns an INSERT-or-update for system_settings compatible with the active DB engine.
 * SQLite: ON CONFLICT … DO UPDATE (upsert by conflict target).
 * MySQL:  ON DUPLICATE KEY UPDATE (requires UNIQUE constraint on `key`).
 */
export function sysSettingsUpsertSql(ds: DataSource): string {
  if (isMySql(ds)) {
    return (
      "INSERT INTO system_settings (`key`, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) " +
      "ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP"
    );
  }
  return (
    "INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) " +
    "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP"
  );
}

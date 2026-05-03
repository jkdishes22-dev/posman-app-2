/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Merge the separate printer_settings, log_settings, and admin_settings rows
 * into a single system_settings row with nested sub-keys.
 * bill_settings remains unchanged as its own top-level key.
 *
 * New shape of system_settings:
 *   { printer_settings: {...}, log_settings: {...}, db_backup: {...} }
 */

module.exports = class ConsolidateSystemSettings1700000000032 {
  name = "ConsolidateSystemSettings1700000000032";

  async up(queryRunner) {
    // Read existing separate rows (may not exist on fresh installs)
    const printerRows = await queryRunner.query(
      "SELECT value FROM system_settings WHERE key = 'printer_settings'"
    );
    const logRows = await queryRunner.query(
      "SELECT value FROM system_settings WHERE key = 'log_settings'"
    );
    const adminRows = await queryRunner.query(
      "SELECT value FROM system_settings WHERE key = 'admin_settings'"
    );

    const printerSettings = printerRows.length
      ? JSON.parse(printerRows[0].value)
      : { print_after_create_bill: false, printer_name: "" };

    const logSettings = logRows.length
      ? JSON.parse(logRows[0].value)
      : { retention_days: 14 };

    const adminSettings = adminRows.length ? JSON.parse(adminRows[0].value) : {};

    const systemSettings = {
      printer_settings: printerSettings,
      log_settings: logSettings,
      db_backup: { frequency: adminSettings.db_backup_frequency || "daily" },
    };

    // Check if system_settings already exists (idempotent)
    const existing = await queryRunner.query(
      "SELECT value FROM system_settings WHERE key = 'system_settings'"
    );

    if (existing.length === 0) {
      await queryRunner.query(
        "INSERT INTO system_settings (key, value) VALUES ('system_settings', ?)",
        [JSON.stringify(systemSettings)]
      );
    } else {
      // Merge preserving any sub-keys that were already written
      const current = JSON.parse(existing[0].value);
      const merged = {
        printer_settings: current.printer_settings || systemSettings.printer_settings,
        log_settings: current.log_settings || systemSettings.log_settings,
        db_backup: current.db_backup || systemSettings.db_backup,
      };
      await queryRunner.query(
        "UPDATE system_settings SET value = ? WHERE key = 'system_settings'",
        [JSON.stringify(merged)]
      );
    }

    // Remove the old separate rows
    await queryRunner.query(
      "DELETE FROM system_settings WHERE key IN ('printer_settings', 'log_settings', 'admin_settings')"
    );

    console.log("[ConsolidateSystemSettings] Merged printer_settings, log_settings, admin_settings → system_settings");
  }

  async down(queryRunner) {
    const rows = await queryRunner.query(
      "SELECT value FROM system_settings WHERE key = 'system_settings'"
    );
    if (!rows.length) return;

    const sysSettings = JSON.parse(rows[0].value);

    const restore = [
      ["printer_settings", JSON.stringify(sysSettings.printer_settings || {})],
      ["log_settings", JSON.stringify(sysSettings.log_settings || {})],
      [
        "admin_settings",
        JSON.stringify({
          db_backup_frequency: sysSettings.db_backup?.frequency || "daily",
        }),
      ],
    ];

    for (const [key, value] of restore) {
      await queryRunner.query(
        "INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [key, value]
      );
    }

    await queryRunner.query(
      "DELETE FROM system_settings WHERE key = 'system_settings'"
    );
  }
};
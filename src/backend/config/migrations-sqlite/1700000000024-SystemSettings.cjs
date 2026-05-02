/* eslint-disable @typescript-eslint/no-require-imports */

module.exports = class SystemSettingsSqlite1700000000024 {
  name = "SystemSettingsSqlite1700000000024";

  async up(queryRunner) {
    // Create system_settings key-value table.
    // Each row is a domain-scoped key whose value is a JSON blob.
    // Sprint 6 will add more rows (printer_settings, bill_settings, etc.)
    // but must NOT recreate this table.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "key"        TEXT NOT NULL,
        "value"      TEXT NOT NULL,
        "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("key")
      )
    `);

    // Seed default settings — INSERT OR IGNORE so re-runs are safe
    await queryRunner.query(`
      INSERT OR IGNORE INTO "system_settings" ("key", "value")
      VALUES ('log_settings', '{"retention_days":14}')
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "system_settings"`);
  }
};

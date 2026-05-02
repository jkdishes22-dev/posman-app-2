module.exports = class SystemSettingsSqlite1700000000023 {
  name = "SystemSettingsSqlite1700000000023";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "key" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("key")
      );
    `);

    await queryRunner.query(`
      INSERT OR IGNORE INTO "system_settings" ("key", "value")
      VALUES ('log_settings', '{"retention_days":14}');
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "system_settings";`);
  }
};

/** @type {import('./sqlite-compat-runner.cjs').MigrationModule} */
module.exports = {
  async up(db) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "key" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("key")
      );
    `);

    await db.query(`
      INSERT OR IGNORE INTO "system_settings" ("key", "value")
      VALUES ('log_settings', '{"retention_days":14}');
    `);
  },

  async down(db) {
    await db.query(`DROP TABLE IF EXISTS "system_settings";`);
  },
};

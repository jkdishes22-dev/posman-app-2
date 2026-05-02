/** @type {import('./sqlite-compat-runner.cjs').MigrationModule} */
module.exports = {
  async up(db) {
    await db.query(`
      INSERT OR IGNORE INTO "system_settings" ("key", "value")
      VALUES ('printer_settings', '{"print_after_close_bill":false,"printer_name":""}');
    `);
  },

  async down(db) {
    await db.query(`DELETE FROM "system_settings" WHERE "key" = 'printer_settings';`);
  },
};

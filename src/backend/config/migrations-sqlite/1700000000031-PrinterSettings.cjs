/**
 * Inserts default printer_settings row. Was 1700000000024 but that timestamp collided with
 * SystemSettingsSqlite (same revision = undefined order in TypeORM).
 */
module.exports = class PrinterSettingsSqlite1700000000031 {
  name = "PrinterSettingsSqlite1700000000031";

  async up(queryRunner) {
    await queryRunner.query(`
      INSERT OR IGNORE INTO "system_settings" ("key", "value")
      VALUES ('printer_settings', '{"print_after_create_bill":false,"printer_name":""}');
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DELETE FROM "system_settings" WHERE "key" = 'printer_settings';`);
  }
};

module.exports = class BillAndAdminSettingsSqlite1700000000025 {
  name = "BillAndAdminSettingsSqlite1700000000025";

  async up(queryRunner) {
    await queryRunner.query(`INSERT OR IGNORE INTO "system_settings" ("key", "value") VALUES ('bill_settings', '{"show_tax_on_receipt":true}')`);
    await queryRunner.query(`INSERT OR IGNORE INTO "system_settings" ("key", "value") VALUES ('admin_settings', '{"db_backup_frequency":"daily"}')`);
  }

  async down(queryRunner) {
    await queryRunner.query(`DELETE FROM "system_settings" WHERE "key" IN ('bill_settings', 'admin_settings')`);
  }
};

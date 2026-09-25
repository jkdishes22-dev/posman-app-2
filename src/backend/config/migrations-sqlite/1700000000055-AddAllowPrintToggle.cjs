const { MigrationInterface } = require("typeorm");

module.exports = class AddAllowPrintToggle1700000000055 {
  name = "AddAllowPrintToggle1700000000055";

  async up(queryRunner) {
    const rows = await queryRunner.query(
      `SELECT value FROM "system_settings" WHERE key = 'system_settings'`
    );
    if (rows.length > 0) {
      const sys = JSON.parse(rows[0].value);
      if (sys.printer_settings && sys.printer_settings.allow_print_toggle === undefined) {
        sys.printer_settings.allow_print_toggle = false;
        await queryRunner.query(
          `UPDATE "system_settings" SET value = ? WHERE key = 'system_settings'`,
          [JSON.stringify(sys)]
        );
      }
    }
  }

  async down(queryRunner) {}
};

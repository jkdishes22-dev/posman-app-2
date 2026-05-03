/**
 * Rename printer_settings flag: print_after_close_bill → print_after_create_bill
 * (semantic: auto-print when a new bill is created, not on cashier close).
 */
module.exports = class PrintAfterCreateBillSettingSqlite1700000000033 {
  name = "PrintAfterCreateBillSettingSqlite1700000000033";

  async up(queryRunner) {
    const rows = await queryRunner.query(
      `SELECT "key", "value" FROM "system_settings" WHERE "key" IN ('system_settings', 'printer_settings')`,
    );
    for (const row of rows) {
      let parsed;
      try {
        parsed = JSON.parse(row.value);
      } catch {
        continue;
      }
      if (row.key === "printer_settings") {
        if (parsed.print_after_create_bill === undefined && parsed.print_after_close_bill !== undefined) {
          parsed.print_after_create_bill = parsed.print_after_close_bill;
        }
        delete parsed.print_after_close_bill;
        await queryRunner.query(`UPDATE "system_settings" SET "value" = ? WHERE "key" = 'printer_settings'`, [
          JSON.stringify(parsed),
        ]);
      }
      if (row.key === "system_settings" && parsed.printer_settings && typeof parsed.printer_settings === "object") {
        const p = parsed.printer_settings;
        if (p.print_after_create_bill === undefined && p.print_after_close_bill !== undefined) {
          p.print_after_create_bill = p.print_after_close_bill;
        }
        delete p.print_after_close_bill;
        await queryRunner.query(`UPDATE "system_settings" SET "value" = ? WHERE "key" = 'system_settings'`, [
          JSON.stringify(parsed),
        ]);
      }
    }
  }

  async down(queryRunner) {
    const rows = await queryRunner.query(
      `SELECT "key", "value" FROM "system_settings" WHERE "key" IN ('system_settings', 'printer_settings')`,
    );
    for (const row of rows) {
      let parsed;
      try {
        parsed = JSON.parse(row.value);
      } catch {
        continue;
      }
      if (row.key === "printer_settings") {
        if (parsed.print_after_close_bill === undefined && parsed.print_after_create_bill !== undefined) {
          parsed.print_after_close_bill = parsed.print_after_create_bill;
        }
        delete parsed.print_after_create_bill;
        await queryRunner.query(`UPDATE "system_settings" SET "value" = ? WHERE "key" = 'printer_settings'`, [
          JSON.stringify(parsed),
        ]);
      }
      if (row.key === "system_settings" && parsed.printer_settings && typeof parsed.printer_settings === "object") {
        const p = parsed.printer_settings;
        if (p.print_after_close_bill === undefined && p.print_after_create_bill !== undefined) {
          p.print_after_close_bill = p.print_after_create_bill;
        }
        delete p.print_after_create_bill;
        await queryRunner.query(`UPDATE "system_settings" SET "value" = ? WHERE "key" = 'system_settings'`, [
          JSON.stringify(parsed),
        ]);
      }
    }
  }
};

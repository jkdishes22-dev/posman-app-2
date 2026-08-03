/* eslint-disable @typescript-eslint/no-require-imports */
module.exports = class CashierCanBill1700000000047 {
  name = "CashierCanBill1700000000047";

  async up(queryRunner) {
    const rows = await queryRunner.query(
      "SELECT `value` FROM `system_settings` WHERE `key` = 'bill_settings'"
    );
    if (rows.length > 0) {
      const settings = JSON.parse(rows[0].value);
      if (settings.cashier_can_bill === undefined) {
        settings.cashier_can_bill = false;
        await queryRunner.query(
          "UPDATE `system_settings` SET `value` = ? WHERE `key` = 'bill_settings'",
          [JSON.stringify(settings)]
        );
      }
    }
  }

  async down(queryRunner) {
    const rows = await queryRunner.query(
      "SELECT `value` FROM `system_settings` WHERE `key` = 'bill_settings'"
    );
    if (rows.length > 0) {
      const settings = JSON.parse(rows[0].value);
      delete settings.cashier_can_bill;
      await queryRunner.query(
        "UPDATE `system_settings` SET `value` = ? WHERE `key` = 'bill_settings'",
        [JSON.stringify(settings)]
      );
    }
  }
};

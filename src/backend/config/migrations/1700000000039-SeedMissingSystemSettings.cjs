/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Seeds system_settings rows that MySQL installs were missing:
 *   - bill_settings  (show_tax_on_receipt flag used on receipts and my-sales)
 *   - business_shifts sub-key inside system_settings (used on admin settings page)
 * All inserts are idempotent via ON DUPLICATE KEY UPDATE.
 */
module.exports = class SeedMissingSystemSettings1700000000039 {
  name = "SeedMissingSystemSettings1700000000039";

  async up(queryRunner) {
    // 1. bill_settings — its own top-level key
    await queryRunner.query(
      "INSERT INTO `system_settings` (`key`, `value`) VALUES ('bill_settings', ?) ON DUPLICATE KEY UPDATE `key` = `key`",
      [JSON.stringify({ show_tax_on_receipt: true })]
    );

    // 2. business_shifts — sub-key inside the system_settings JSON blob
    const rows = await queryRunner.query(
      "SELECT `value` FROM `system_settings` WHERE `key` = 'system_settings'"
    );
    if (rows.length > 0) {
      const current = JSON.parse(rows[0].value);
      if (!current.business_shifts) {
        current.business_shifts = [];
        await queryRunner.query(
          "UPDATE `system_settings` SET `value` = ? WHERE `key` = 'system_settings'",
          [JSON.stringify(current)]
        );
      }
    }

    console.log("[SeedMissingSystemSettings] bill_settings and business_shifts seeded");
  }

  async down(queryRunner) {
    await queryRunner.query("DELETE FROM `system_settings` WHERE `key` = 'bill_settings'");

    const rows = await queryRunner.query(
      "SELECT `value` FROM `system_settings` WHERE `key` = 'system_settings'"
    );
    if (rows.length > 0) {
      const current = JSON.parse(rows[0].value);
      delete current.business_shifts;
      await queryRunner.query(
        "UPDATE `system_settings` SET `value` = ? WHERE `key` = 'system_settings'",
        [JSON.stringify(current)]
      );
    }
  }
};
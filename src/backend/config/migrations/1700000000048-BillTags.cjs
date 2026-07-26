/* eslint-disable @typescript-eslint/no-require-imports */
module.exports = class BillTags1700000000048 {
  name = "BillTags1700000000048";

  async up(queryRunner) {
    await queryRunner.query("ALTER TABLE `bill` ADD COLUMN `tags` TEXT NULL");
    const rows = await queryRunner.query(
      "SELECT `value` FROM `system_settings` WHERE `key` = 'bill_settings'"
    );
    if (rows.length > 0) {
      const settings = JSON.parse(rows[0].value);
      if (settings.bill_tags === undefined) {
        settings.bill_tags = [];
        await queryRunner.query(
          "UPDATE `system_settings` SET `value` = ? WHERE `key` = 'bill_settings'",
          [JSON.stringify(settings)]
        );
      }
    }
  }

  async down(queryRunner) {
    await queryRunner.query("ALTER TABLE `bill` DROP COLUMN `tags`");
    const rows = await queryRunner.query(
      "SELECT `value` FROM `system_settings` WHERE `key` = 'bill_settings'"
    );
    if (rows.length > 0) {
      const settings = JSON.parse(rows[0].value);
      delete settings.bill_tags;
      await queryRunner.query(
        "UPDATE `system_settings` SET `value` = ? WHERE `key` = 'bill_settings'",
        [JSON.stringify(settings)]
      );
    }
  }
};

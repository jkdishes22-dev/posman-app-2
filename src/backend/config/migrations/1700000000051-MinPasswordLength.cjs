/* eslint-disable @typescript-eslint/no-require-imports */
module.exports = class MinPasswordLength1700000000051 {
  name = "MinPasswordLength1700000000051";

  async up(queryRunner) {
    const rows = await queryRunner.query(
      "SELECT `value` FROM `system_settings` WHERE `key` = 'system_settings'"
    );
    if (rows.length > 0) {
      const settings = JSON.parse(rows[0].value);
      if (!settings.security_policy) {
        settings.security_policy = { min_password_length: 8 };
        await queryRunner.query(
          "UPDATE `system_settings` SET `value` = ? WHERE `key` = 'system_settings'",
          [JSON.stringify(settings)]
        );
      }
    }
  }

  async down(queryRunner) {
    const rows = await queryRunner.query(
      "SELECT `value` FROM `system_settings` WHERE `key` = 'system_settings'"
    );
    if (rows.length > 0) {
      const settings = JSON.parse(rows[0].value);
      delete settings.security_policy;
      await queryRunner.query(
        "UPDATE `system_settings` SET `value` = ? WHERE `key` = 'system_settings'",
        [JSON.stringify(settings)]
      );
    }
  }
};

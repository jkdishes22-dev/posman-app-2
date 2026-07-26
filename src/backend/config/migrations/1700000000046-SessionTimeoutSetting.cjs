/* eslint-disable @typescript-eslint/no-require-imports */
module.exports = class SessionTimeoutSetting1700000000046 {
  name = "SessionTimeoutSetting1700000000046";

  async up(queryRunner) {
    const rows = await queryRunner.query(
      "SELECT `value` FROM `system_settings` WHERE `key` = 'system_settings'"
    );
    if (rows.length > 0) {
      const settings = JSON.parse(rows[0].value);
      if (!settings.session_config) {
        settings.session_config = { session_timeout: "8h" };
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
      delete settings.session_config;
      await queryRunner.query(
        "UPDATE `system_settings` SET `value` = ? WHERE `key` = 'system_settings'",
        [JSON.stringify(settings)]
      );
    }
  }
};

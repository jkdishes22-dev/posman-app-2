/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Adds `must_change_password` boolean column to the `user` table.
 *
 * - Defaults to FALSE for all existing rows (non-breaking).
 * - Sets the flag to TRUE for any user named "admin" (the seeded default) so that
 *   existing installations are prompted to change the default password on next login.
 */
module.exports = class MustChangePassword1700000000045 {
  name = "MustChangePassword1700000000045";

  async up(queryRunner) {
    // Add column (defaults to FALSE / 0)
    await queryRunner.query(
      "ALTER TABLE `user` ADD `must_change_password` tinyint NOT NULL DEFAULT 0"
    );

    // Flag all users named "admin" (the seeded default) so they are prompted on next login
    await queryRunner.query(
      "UPDATE `user` SET `must_change_password` = 1 WHERE `username` = 'admin'"
    );
  }

  async down(queryRunner) {
    await queryRunner.query(
      "ALTER TABLE `user` DROP COLUMN `must_change_password`"
    );
  }
};

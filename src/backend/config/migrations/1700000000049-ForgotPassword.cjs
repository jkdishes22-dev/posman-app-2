/* eslint-disable @typescript-eslint/no-require-imports */
module.exports = class ForgotPassword1700000000049 {
  name = "ForgotPassword1700000000049";

  async up(queryRunner) {
    await queryRunner.query("ALTER TABLE `user` ADD COLUMN `security_question` TEXT NULL");
    await queryRunner.query("ALTER TABLE `user` ADD COLUMN `security_answer_hash` TEXT NULL");
    await queryRunner.query("ALTER TABLE `user` ADD COLUMN `recovery_code_hash` TEXT NULL");
    await queryRunner.query("ALTER TABLE `user` ADD COLUMN `recovery_code_generated_at` DATETIME NULL");
  }

  async down(queryRunner) {
    await queryRunner.query("ALTER TABLE `user` DROP COLUMN `recovery_code_generated_at`");
    await queryRunner.query("ALTER TABLE `user` DROP COLUMN `recovery_code_hash`");
    await queryRunner.query("ALTER TABLE `user` DROP COLUMN `security_answer_hash`");
    await queryRunner.query("ALTER TABLE `user` DROP COLUMN `security_question`");
  }
};

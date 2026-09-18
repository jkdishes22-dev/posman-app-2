const { MigrationInterface } = require("typeorm");

module.exports = class LastLoginAt1700000000054 {
  name = "LastLoginAt1700000000054";

  async up(queryRunner) {
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "last_login_at" datetime NULL`
    );
  }

  async down(queryRunner) {
    // SQLite does not support DROP COLUMN; recreate the table without the column.
    await queryRunner.query(`CREATE TABLE "user_backup" AS SELECT
      "id", "created_at", "updated_at", "username", "lastName", "firstName",
      "password", "status", "refreshToken", "is_locked", "must_change_password",
      "security_question", "security_answer_hash", "recovery_code_hash",
      "recovery_code_generated_at"
      FROM "user"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`ALTER TABLE "user_backup" RENAME TO "user"`);
  }
};

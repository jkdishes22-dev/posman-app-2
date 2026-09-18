const { MigrationInterface } = require("typeorm");

module.exports = class LastLoginAt1700000000054 {
  name = "LastLoginAt1700000000054";

  async up(queryRunner) {
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD COLUMN \`last_login_at\` datetime NULL`
    );
  }

  async down(queryRunner) {
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP COLUMN \`last_login_at\``
    );
  }
};

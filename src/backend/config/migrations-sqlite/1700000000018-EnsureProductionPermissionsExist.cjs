/* eslint-disable @typescript-eslint/no-require-imports */
const { patchQueryRunner } = require("./sqlite-compat-runner.cjs");
const OriginalMigration = require("../migrations/1700000000018-EnsureProductionPermissionsExist.cjs");

module.exports = class EnsureProductionPermissionsExistSqlite1700000000018 {
  name = "EnsureProductionPermissionsExistSqlite1700000000018";

  async up(queryRunner) {
    const migration = new OriginalMigration();
    await migration.up(patchQueryRunner(queryRunner));
  }

  async down(queryRunner) {
    const migration = new OriginalMigration();
    if (migration.down) {
      await migration.down(patchQueryRunner(queryRunner));
    }
  }
};

/* eslint-disable @typescript-eslint/no-require-imports */
const { patchQueryRunner } = require("./sqlite-compat-runner.cjs");
const OriginalMigration = require("../migrations/0001-SeedInitialData.cjs");

module.exports = class SeedInitialDataSqlite0001 {
  name = "SeedInitialDataSqlite0001";

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

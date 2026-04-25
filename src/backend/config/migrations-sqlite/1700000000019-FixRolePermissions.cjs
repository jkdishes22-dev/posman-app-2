/* eslint-disable @typescript-eslint/no-require-imports */
const { patchQueryRunner } = require("./sqlite-compat-runner.cjs");
const OriginalMigration = require("../migrations/1700000000019-FixRolePermissions.cjs");

module.exports = class FixRolePermissionsSqlite1700000000019 {
  name = "FixRolePermissionsSqlite1700000000019";

  async up(queryRunner) {
    const migration = new OriginalMigration();
    await migration.up(patchQueryRunner(queryRunner));
  }

  async down(queryRunner) {
    const migration = new OriginalMigration();
    await migration.down(patchQueryRunner(queryRunner));
  }
};

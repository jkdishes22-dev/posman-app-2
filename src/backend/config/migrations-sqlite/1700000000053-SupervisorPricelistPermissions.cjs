/* eslint-disable @typescript-eslint/no-require-imports */
const { patchQueryRunner } = require("./sqlite-compat-runner.cjs");
const OriginalMigration = require("../migrations/1700000000053-SupervisorPricelistPermissions.cjs");

module.exports = class SupervisorPricelistPermissionsSqlite1700000000053 {
  name = "SupervisorPricelistPermissionsSqlite1700000000053";

  async up(queryRunner) {
    await new OriginalMigration().up(patchQueryRunner(queryRunner));
  }

  async down(queryRunner) {
    await new OriginalMigration().down(patchQueryRunner(queryRunner));
  }
};

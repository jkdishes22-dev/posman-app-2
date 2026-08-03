/* eslint-disable @typescript-eslint/no-require-imports */
const { patchQueryRunner } = require("./sqlite-compat-runner.cjs");
const OriginalMigration = require("../migrations/1700000000050-CashierBillingPermissions.cjs");

module.exports = class CashierBillingPermissionsSqlite1700000000050 {
  name = "CashierBillingPermissionsSqlite1700000000050";

  async up(queryRunner) {
    await new OriginalMigration().up(patchQueryRunner(queryRunner));
  }

  async down(queryRunner) {
    await new OriginalMigration().down(patchQueryRunner(queryRunner));
  }
};

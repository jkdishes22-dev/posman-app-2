/* eslint-disable @typescript-eslint/no-require-imports */
const { patchQueryRunner } = require("./sqlite-compat-runner.cjs");
const OriginalMigration = require("../migrations/1700000000056-SupervisorUserManagement.cjs");

module.exports = class SupervisorUserManagementSqlite1700000000056 {
  name = "SupervisorUserManagementSqlite1700000000056";

  async up(queryRunner) {
    await new OriginalMigration().up(patchQueryRunner(queryRunner));
  }

  async down(queryRunner) {
    await new OriginalMigration().down(patchQueryRunner(queryRunner));
  }
};

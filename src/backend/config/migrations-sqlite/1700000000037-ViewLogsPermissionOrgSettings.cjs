/* eslint-disable @typescript-eslint/no-require-imports */
const { patchQueryRunner } = require("./sqlite-compat-runner.cjs");
const OriginalMigration = require("../migrations/1700000000037-ViewLogsPermissionOrgSettings.cjs");

module.exports = class ViewLogsPermissionOrgSettingsSqlite1700000000037 {
    name = "ViewLogsPermissionOrgSettingsSqlite1700000000037";

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

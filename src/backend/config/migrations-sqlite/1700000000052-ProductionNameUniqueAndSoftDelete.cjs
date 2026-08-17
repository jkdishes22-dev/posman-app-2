/* eslint-disable @typescript-eslint/no-require-imports */
const { patchQueryRunner } = require("./sqlite-compat-runner.cjs");

module.exports = class ProductionNameUniqueAndSoftDeleteSqlite1700000000052 {
    name = "ProductionNameUniqueAndSoftDeleteSqlite1700000000052";

    async up(queryRunner) {
        const qr = patchQueryRunner(queryRunner);

        // Add soft-delete column
        await qr.query(`ALTER TABLE "production" ADD COLUMN "deleted_at" DATETIME`);

        // Deduplicate names (keep oldest) before adding unique index
        await qr.query(`
            DELETE FROM "production"
            WHERE id NOT IN (
                SELECT MIN(id) FROM "production" GROUP BY name
            )
        `);

        await qr.query(
            `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_production_name" ON "production" ("name")`
        );

        console.log("✅ production: added deleted_at + unique index on name");
    }

    async down(queryRunner) {
        const qr = patchQueryRunner(queryRunner);
        await qr.query(`DROP INDEX IF EXISTS "UQ_production_name"`);
        // SQLite cannot DROP COLUMN — recreate table without deleted_at
        await qr.query(`
            CREATE TABLE "production_backup" AS SELECT
                id, name, description, status,
                created_at, updated_at, created_by, updated_by
            FROM "production"
        `);
        await qr.query(`DROP TABLE "production"`);
        await qr.query(`ALTER TABLE "production_backup" RENAME TO "production"`);
        console.log("✅ production: reverted deleted_at + unique index");
    }
};

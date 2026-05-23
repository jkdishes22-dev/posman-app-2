/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Production refactor migration (SQLite):
 * - Creates `production` table (bucket/header, replacing production_issue concept)
 * - Creates `production_item` table (line items, replaces production_preparation)
 * - Migrates production_preparation data → production_item
 *   (status mapping: issued/approved → issued, pending → issued, rejected → cancelled)
 * - Drops production_preparation and production_issue tables
 */
const { patchQueryRunner } = require("./sqlite-compat-runner.cjs");

module.exports = class ProductionRefactorSqlite1700000000044 {
    name = "ProductionRefactorSqlite1700000000044";

    async up(queryRunner) {
        const qr = patchQueryRunner(queryRunner);

        console.log("🔧 ProductionRefactor (SQLite): creating production table...");

        await qr.query(`
            CREATE TABLE IF NOT EXISTS "production" (
                "id"          INTEGER PRIMARY KEY AUTOINCREMENT,
                "name"        VARCHAR(255) NOT NULL,
                "description" TEXT,
                "status"      VARCHAR(20) NOT NULL DEFAULT 'open',
                "created_at"  DATETIME DEFAULT CURRENT_TIMESTAMP,
                "updated_at"  DATETIME DEFAULT CURRENT_TIMESTAMP,
                "created_by"  INTEGER,
                "updated_by"  INTEGER
            )
        `);
        await qr.query(`CREATE INDEX IF NOT EXISTS "IDX_production_status" ON "production" ("status")`);
        await qr.query(`CREATE INDEX IF NOT EXISTS "IDX_production_created_at" ON "production" ("created_at")`);
        console.log("  ✅ production table created");

        console.log("🔧 ProductionRefactor (SQLite): creating production_item table...");

        await qr.query(`
            CREATE TABLE IF NOT EXISTS "production_item" (
                "id"                INTEGER PRIMARY KEY AUTOINCREMENT,
                "production_id"     INTEGER,
                "item_id"           INTEGER NOT NULL,
                "quantity_produced"  INTEGER NOT NULL,
                "status"            VARCHAR(20) NOT NULL DEFAULT 'issued',
                "issued_by"         INTEGER,
                "issued_at"         DATETIME,
                "notes"             TEXT,
                "created_at"        DATETIME DEFAULT CURRENT_TIMESTAMP,
                "updated_at"        DATETIME DEFAULT CURRENT_TIMESTAMP,
                "created_by"        INTEGER,
                "updated_by"        INTEGER,
                FOREIGN KEY ("production_id") REFERENCES "production"("id"),
                FOREIGN KEY ("item_id") REFERENCES "item"("id"),
                FOREIGN KEY ("issued_by") REFERENCES "user"("id")
            )
        `);
        await qr.query(`CREATE INDEX IF NOT EXISTS "IDX_production_item_production_id" ON "production_item" ("production_id")`);
        await qr.query(`CREATE INDEX IF NOT EXISTS "IDX_production_item_item_id" ON "production_item" ("item_id")`);
        await qr.query(`CREATE INDEX IF NOT EXISTS "IDX_production_item_issued_by" ON "production_item" ("issued_by")`);
        await qr.query(`CREATE INDEX IF NOT EXISTS "IDX_production_item_issued_at" ON "production_item" ("issued_at")`);
        console.log("  ✅ production_item table created");

        // Check if production_preparation exists before migrating
        const tables = await queryRunner.query(
            `SELECT name FROM sqlite_master WHERE type='table' AND name='production_preparation'`
        );
        if (Array.isArray(tables) && tables.length > 0) {
            console.log("🔧 ProductionRefactor (SQLite): migrating production_preparation → production_item...");
            await qr.query(`
                INSERT INTO "production_item" (
                    "production_id", "item_id", "quantity_produced", "status",
                    "issued_by", "issued_at", "notes",
                    "created_at", "updated_at", "created_by", "updated_by"
                )
                SELECT
                    NULL,
                    item_id,
                    quantity_prepared,
                    CASE
                        WHEN status IN ('issued', 'approved') THEN 'issued'
                        WHEN status = 'pending' THEN 'issued'
                        WHEN status = 'rejected' THEN 'cancelled'
                        ELSE 'issued'
                    END,
                    COALESCE(issued_by, prepared_by),
                    COALESCE(issued_at, prepared_at),
                    notes,
                    created_at,
                    updated_at,
                    COALESCE(created_by, prepared_by),
                    updated_by
                FROM "production_preparation"
            `);
            console.log("  ✅ production_preparation data migrated to production_item");

            await qr.query(`DROP TABLE IF EXISTS "production_preparation"`);
            console.log("  ✅ production_preparation dropped");
        } else {
            console.log("  ⏭️  production_preparation table not found — skipping data migration");
        }

        // Drop production_issue (unused write path)
        const issueTable = await queryRunner.query(
            `SELECT name FROM sqlite_master WHERE type='table' AND name='production_issue'`
        );
        if (Array.isArray(issueTable) && issueTable.length > 0) {
            await qr.query(`DROP TABLE IF EXISTS "production_issue"`);
            console.log("  ✅ production_issue dropped");
        } else {
            console.log("  ⏭️  production_issue table not found — skipping");
        }

        console.log("✅ ProductionRefactor migration complete");
    }

    async down(queryRunner) {
        const qr = patchQueryRunner(queryRunner);
        console.log("⬇️  ProductionRefactor (SQLite): reverting...");

        // Recreate production_preparation
        await qr.query(`
            CREATE TABLE IF NOT EXISTS "production_preparation" (
                "id"                INTEGER PRIMARY KEY AUTOINCREMENT,
                "item_id"           INTEGER NOT NULL,
                "quantity_prepared"  INTEGER NOT NULL,
                "status"            VARCHAR(20) NOT NULL DEFAULT 'pending',
                "prepared_by"       INTEGER NOT NULL,
                "prepared_at"       DATETIME,
                "issued_by"         INTEGER,
                "issued_at"         DATETIME,
                "notes"             TEXT,
                "rejection_reason"  TEXT,
                "created_at"        DATETIME DEFAULT CURRENT_TIMESTAMP,
                "updated_at"        DATETIME DEFAULT CURRENT_TIMESTAMP,
                "created_by"        INTEGER,
                "updated_by"        INTEGER
            )
        `);
        // Copy data back (best-effort)
        await qr.query(`
            INSERT INTO "production_preparation" (
                "item_id", "quantity_prepared", "status",
                "prepared_by", "prepared_at", "issued_by", "issued_at", "notes",
                "created_at", "updated_at", "created_by", "updated_by"
            )
            SELECT
                item_id, quantity_produced, status,
                COALESCE(created_by, 0), created_at, issued_by, issued_at, notes,
                created_at, updated_at, created_by, updated_by
            FROM "production_item"
        `);

        await qr.query(`DROP TABLE IF EXISTS "production_item"`);
        await qr.query(`DROP TABLE IF EXISTS "production"`);
        console.log("  ✅ ProductionRefactor reverted");
    }
};

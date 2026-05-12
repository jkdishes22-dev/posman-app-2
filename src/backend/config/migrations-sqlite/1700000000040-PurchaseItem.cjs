/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * SQLite equivalent of 1700000000040-PurchaseItem.
 * Uses the patchQueryRunner wrapper so MySQL queries (backtick identifiers, NOW())
 * work transparently, with manual SQLite-only guards for DDL.
 */
const { patchQueryRunner } = require("./sqlite-compat-runner.cjs");

module.exports = class PurchaseItemSqlite1700000000040 {
    name = "PurchaseItemSqlite1700000000040";

    async up(queryRunner) {
        const qr = patchQueryRunner(queryRunner);

        console.log("🔧 PurchaseItem (SQLite): creating purchase_item table...");

        await qr.query(`
            CREATE TABLE IF NOT EXISTS "purchase_item" (
                "id"                   INTEGER PRIMARY KEY AUTOINCREMENT,
                "item_id"              INTEGER NOT NULL,
                "purchase_unit_label"  VARCHAR(100) NOT NULL,
                "purchase_unit_qty"    DECIMAL(10,4) NOT NULL,
                "unit_of_measure"      VARCHAR(50),
                "is_active"            INTEGER NOT NULL DEFAULT 1,
                "created_at"           DATETIME DEFAULT CURRENT_TIMESTAMP,
                "updated_at"           DATETIME DEFAULT CURRENT_TIMESTAMP,
                "created_by"           INTEGER,
                "updated_by"           INTEGER,
                FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE CASCADE
            )
        `);
        await qr.query(
            `CREATE UNIQUE INDEX IF NOT EXISTS "uq_purchase_item_item" ON "purchase_item" ("item_id")`
        );
        console.log("  ✅ purchase_item table created");

        // Snapshot columns (guarded via PRAGMA table_info)
        const colsPOI = await queryRunner.query(`PRAGMA table_info("purchase_order_item")`);
        const poiCols = new Set(colsPOI.map((r) => r.name));

        if (!poiCols.has("pack_label")) {
            await qr.query(`ALTER TABLE "purchase_order_item" ADD COLUMN "pack_label" VARCHAR(100)`);
            console.log("  ✅ purchase_order_item.pack_label added");
        } else {
            console.log("  ⏭️  purchase_order_item.pack_label already exists");
        }

        if (!poiCols.has("pack_qty")) {
            await qr.query(
                `ALTER TABLE "purchase_order_item" ADD COLUMN "pack_qty" DECIMAL(10,4) NOT NULL DEFAULT 1`
            );
            console.log("  ✅ purchase_order_item.pack_qty added");
        } else {
            console.log("  ⏭️  purchase_order_item.pack_qty already exists");
        }

        // Seed permission (reuse same logic via patched runner)
        const permName = "can_manage_purchase_items";
        let scopeId = null;
        const invScope = await qr.query(
            "SELECT id FROM \"permission_scope\" WHERE name IN ('inventory', 'financial', 'operations') LIMIT 1"
        );
        if (Array.isArray(invScope) && invScope.length > 0) {
            scopeId = invScope[0].id;
        }

        const existingPerm = await qr.query(
            "SELECT id FROM \"permissions\" WHERE name = ?", [permName]
        );
        let permId;
        if (!Array.isArray(existingPerm) || existingPerm.length === 0) {
            const result = await qr.query(
                "INSERT INTO \"permissions\" (\"name\", \"scope_id\", \"created_at\") VALUES (?, ?, CURRENT_TIMESTAMP)",
                [permName, scopeId]
            );
            permId = result.insertId;
            console.log(`  ✅ Created permission: ${permName}`);
        } else {
            permId = existingPerm[0].id;
            console.log(`  ⏭️  Permission ${permName} already exists`);
        }

        for (const roleName of ["admin", "supervisor", "storekeeper"]) {
            const roleRows = await qr.query(
                "SELECT id FROM \"roles\" WHERE name = ?", [roleName]
            );
            if (!Array.isArray(roleRows) || roleRows.length === 0) {
                console.warn(`  ⚠️  Role ${roleName} not found — skipping`);
                continue;
            }
            const roleId = roleRows[0].id;
            const link = await qr.query(
                "SELECT id FROM \"role_permissions\" WHERE role_id = ? AND permission_id = ?",
                [roleId, permId]
            );
            if (!Array.isArray(link) || link.length === 0) {
                await qr.query(
                    "INSERT INTO \"role_permissions\" (\"role_id\", \"permission_id\", \"created_at\") VALUES (?, ?, CURRENT_TIMESTAMP)",
                    [roleId, permId]
                );
                console.log(`  ✅ Assigned ${permName} → ${roleName}`);
            } else {
                console.log(`  ⏭️  ${permName} already assigned to ${roleName}`);
            }
        }

        console.log("✅ PurchaseItem (SQLite) migration done.");
    }

    async down(queryRunner) {
        console.warn("PurchaseItem SQLite down(): no-op — cannot drop columns in SQLite");
    }
};

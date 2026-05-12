/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Adds purchase_item table (purchase config per suppliable item), snapshots
 * pack_label / pack_qty onto purchase_order_item, and seeds the
 * can_manage_purchase_items permission for admin, supervisor, and storekeeper.
 *
 * pack_qty DEFAULT 1 means all existing PO rows multiply by 1 on receive — no change.
 */
module.exports = class PurchaseItem1700000000040 {
    name = "PurchaseItem1700000000040";

    async up(queryRunner) {
        console.log("🔧 PurchaseItem: creating purchase_item table...");

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`purchase_item\` (
                \`id\`                   int unsigned NOT NULL AUTO_INCREMENT,
                \`item_id\`              int unsigned NOT NULL,
                \`purchase_unit_label\`  varchar(100) NOT NULL,
                \`purchase_unit_qty\`    decimal(10,4) NOT NULL,
                \`unit_of_measure\`      varchar(50) DEFAULT NULL,
                \`is_active\`            tinyint(1) NOT NULL DEFAULT 1,
                \`created_at\`           datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\`           datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                \`created_by\`           int unsigned DEFAULT NULL,
                \`updated_by\`           int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`uq_purchase_item_item\` (\`item_id\`),
                CONSTRAINT \`fk_purchase_item_item\` FOREIGN KEY (\`item_id\`) REFERENCES \`item\`(\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);
        console.log("  ✅ purchase_item table created");

        // Snapshot columns on purchase_order_item (guarded against re-runs)
        const cols = await queryRunner.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'purchase_order_item' AND TABLE_SCHEMA = DATABASE() AND COLUMN_NAME IN ('pack_label', 'pack_qty')"
        );
        const existing = new Set(cols.map((r) => r.COLUMN_NAME));

        if (!existing.has("pack_label")) {
            await queryRunner.query(
                "ALTER TABLE `purchase_order_item` ADD COLUMN `pack_label` varchar(100) DEFAULT NULL"
            );
            console.log("  ✅ purchase_order_item.pack_label added");
        } else {
            console.log("  ⏭️  purchase_order_item.pack_label already exists");
        }

        if (!existing.has("pack_qty")) {
            await queryRunner.query(
                "ALTER TABLE `purchase_order_item` ADD COLUMN `pack_qty` decimal(10,4) NOT NULL DEFAULT 1"
            );
            console.log("  ✅ purchase_order_item.pack_qty added");
        } else {
            console.log("  ⏭️  purchase_order_item.pack_qty already exists");
        }

        // Seed can_manage_purchase_items permission
        console.log("  🔧 Seeding can_manage_purchase_items permission...");
        const permName = "can_manage_purchase_items";

        // Find inventory/financial scope (fall back to any existing scope)
        let scopeId = null;
        const invScope = await queryRunner.query(
            "SELECT id FROM `permission_scope` WHERE name IN ('inventory', 'financial', 'operations') LIMIT 1"
        );
        if (invScope.length > 0) {
            scopeId = invScope[0].id;
        }

        const existingPerm = await queryRunner.query(
            "SELECT id FROM `permissions` WHERE name = ?", [permName]
        );
        let permId;
        if (existingPerm.length === 0) {
            const result = await queryRunner.query(
                "INSERT INTO `permissions` (`name`, `scope_id`, `created_at`) VALUES (?, ?, NOW())",
                [permName, scopeId]
            );
            permId = result.insertId;
            console.log(`  ✅ Created permission: ${permName}`);
        } else {
            permId = existingPerm[0].id;
            console.log(`  ⏭️  Permission ${permName} already exists`);
        }

        // Assign to admin, supervisor, storekeeper
        for (const roleName of ["admin", "supervisor", "storekeeper"]) {
            const roleRows = await queryRunner.query(
                "SELECT id FROM `roles` WHERE name = ?", [roleName]
            );
            if (roleRows.length === 0) {
                console.warn(`  ⚠️  Role ${roleName} not found — skipping`);
                continue;
            }
            const roleId = roleRows[0].id;
            const link = await queryRunner.query(
                "SELECT id FROM `role_permissions` WHERE role_id = ? AND permission_id = ?",
                [roleId, permId]
            );
            if (link.length === 0) {
                await queryRunner.query(
                    "INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`) VALUES (?, ?, NOW())",
                    [roleId, permId]
                );
                console.log(`  ✅ Assigned ${permName} → ${roleName}`);
            } else {
                console.log(`  ⏭️  ${permName} already assigned to ${roleName}`);
            }
        }

        console.log("✅ PurchaseItem migration done.");
    }

    async down(queryRunner) {
        await queryRunner.query("DROP TABLE IF EXISTS `purchase_item`");

        const permRows = await queryRunner.query(
            "SELECT id FROM `permissions` WHERE name = 'can_manage_purchase_items'"
        );
        if (permRows.length > 0) {
            const permId = permRows[0].id;
            await queryRunner.query("DELETE FROM `role_permissions` WHERE permission_id = ?", [permId]);
            await queryRunner.query("DELETE FROM `permissions` WHERE id = ?", [permId]);
        }
    }
};

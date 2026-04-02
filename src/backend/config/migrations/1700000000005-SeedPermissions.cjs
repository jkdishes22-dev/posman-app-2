/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Seeds Permissions based on ROLE_PERMISSIONS from role-permissions.ts
 * Maps permissions to their appropriate PermissionScopes based on PERMISSION_CATEGORIES
 */
class SeedPermissions1700000000005 {
    constructor() {
        this.name = "SeedPermissions1700000000005";
    }

    async up(queryRunner) {
        // Get all scope IDs
        const scopeMap = {};
        const scopes = await queryRunner.query(
            "SELECT id, name FROM `permission_scope`"
        );

        for (const scope of scopes) {
            scopeMap[scope.name] = scope.id;
        }

        // Permission mapping based on PERMISSION_CATEGORIES
        // Permissions are mapped to their scope categories
        const permissionMappings = {
            // System scope
            system: [
                "can_view_role", "can_add_role", "can_edit_role", "can_delete_role",
                "can_view_permission", "can_add_permission", "can_edit_permission", "can_delete_permission",
                "can_view_user", "can_add_user", "can_edit_user", "can_delete_user",
                "can_view_role_permission", "can_add_role_permission", "can_edit_role_permission", "can_delete_role_permission",
                "can_view_permission_scope", "can_edit_permission_scope", "can_delete_permission_scope",
                "can_manage_role"
            ],
            // Billing scope
            billing: [
                "can_view_bill", "can_add_bill", "can_edit_bill", "can_delete_bill",
                "can_view_bill_item", "can_add_bill_item", "can_edit_bill_item", "can_delete_bill_item",
                "can_view_bill_payment", "can_add_bill_payment", "can_edit_bill_payment", "can_delete_bill_payment"
            ],
            // Financial scope
            financial: [
                "can_view_payment", "can_add_payment", "can_edit_payment", "can_delete_payment"
            ],
            // Inventory scope (includes supplier, purchase order, and production permissions)
            inventory: [
                "can_view_inventory", "can_add_inventory", "can_edit_inventory", "can_delete_inventory", "can_adjust_inventory",
                "can_view_item", "can_add_item", "can_edit_item", "can_delete_item",
                "can_view_category", "can_add_category", "can_edit_category", "can_delete_category",
                "can_view_supplier", "can_add_supplier", "can_edit_supplier", "can_delete_supplier",
                "can_view_supplier_payment", "can_add_supplier_payment", "can_edit_supplier_payment", "can_delete_supplier_payment",
                "can_view_purchase_order", "can_add_purchase_order", "can_edit_purchase_order", "can_delete_purchase_order", "can_receive_purchase_order",
                "can_issue_production", "can_view_production_history"
            ],
            // Stations scope
            stations: [
                "can_view_station", "can_add_station", "can_edit_station", "can_delete_station",
                "can_view_user_station", "can_add_user_station", "can_edit_user_station", "can_delete_user_station",
                "can_view_station_pricelist", "can_add_station_pricelist", "can_edit_station_pricelist", "can_delete_station_pricelist"
            ],
            // Pricelists scope
            pricelists: [
                "can_view_pricelist", "can_add_pricelist", "can_edit_pricelist", "can_delete_pricelist"
            ]
        };

        console.log("🌱 Seeding permissions...");

        let createdCount = 0;
        let skippedCount = 0;

        for (const [scopeName, permissions] of Object.entries(permissionMappings)) {
            const scopeId = scopeMap[scopeName];

            if (!scopeId) {
                console.log(`   ⚠️  Warning: Scope '${scopeName}' not found, skipping permissions`);
                continue;
            }

            for (const permissionName of permissions) {
                // Check if permission already exists
                const existingPermission = await queryRunner.query(
                    "SELECT id FROM `permissions` WHERE `name` = ?",
                    [permissionName]
                );

                if (existingPermission.length === 0) {
                    // Insert permission with scope
                    await queryRunner.query(
                        `INSERT INTO \`permissions\` (\`name\`, \`scope_id\`, \`created_at\`, \`updated_at\`) 
                         VALUES (?, ?, NOW(), NULL)`,
                        [permissionName, scopeId]
                    );
                    createdCount++;
                } else {
                    // Update existing permission to ensure it has the correct scope
                    await queryRunner.query(
                        "UPDATE `permissions` SET `scope_id` = ?, `updated_at` = NOW() WHERE `name` = ?",
                        [scopeId, permissionName]
                    );
                    skippedCount++;
                }
            }
        }

        console.log(`   ✅ Created ${createdCount} new permissions`);
        if (skippedCount > 0) {
            console.log(`   ⏭️  Updated ${skippedCount} existing permissions with scopes`);
        }
        console.log("✅ Permission seeding completed!");
    }

    async down(queryRunner) {
        // Get all permissions that were seeded
        const allPermissions = [
            // System
            "can_view_role", "can_add_role", "can_edit_role", "can_delete_role",
            "can_view_permission", "can_add_permission", "can_edit_permission", "can_delete_permission",
            "can_view_user", "can_add_user", "can_edit_user", "can_delete_user",
            "can_view_role_permission", "can_add_role_permission", "can_edit_role_permission", "can_delete_role_permission",
            "can_view_permission_scope", "can_edit_permission_scope", "can_delete_permission_scope",
            "can_manage_role",
            // Billing
            "can_view_bill", "can_add_bill", "can_edit_bill", "can_delete_bill",
            "can_view_bill_item", "can_add_bill_item", "can_edit_bill_item", "can_delete_bill_item",
            "can_view_bill_payment", "can_add_bill_payment", "can_edit_bill_payment", "can_delete_bill_payment",
            // Financial
            "can_view_payment", "can_add_payment", "can_edit_payment", "can_delete_payment",
            // Inventory
            "can_view_inventory", "can_add_inventory", "can_edit_inventory", "can_delete_inventory", "can_adjust_inventory",
            "can_view_item", "can_add_item", "can_edit_item", "can_delete_item",
            "can_view_category", "can_add_category", "can_edit_category", "can_delete_category",
            "can_view_supplier", "can_add_supplier", "can_edit_supplier", "can_delete_supplier",
            "can_view_supplier_payment", "can_add_supplier_payment", "can_edit_supplier_payment", "can_delete_supplier_payment",
            "can_view_purchase_order", "can_add_purchase_order", "can_edit_purchase_order", "can_delete_purchase_order", "can_receive_purchase_order",
            "can_issue_production", "can_view_production_history",
            // Stations
            "can_view_station", "can_add_station", "can_edit_station", "can_delete_station",
            "can_view_user_station", "can_add_user_station", "can_edit_user_station", "can_delete_user_station",
            "can_view_station_pricelist", "can_add_station_pricelist", "can_edit_station_pricelist", "can_delete_station_pricelist",
            // Pricelists
            "can_view_pricelist", "can_add_pricelist", "can_edit_pricelist", "can_delete_pricelist"
        ];

        console.log("🔄 Removing seeded permissions...");

        for (const permissionName of allPermissions) {
            await queryRunner.query(
                "DELETE FROM `permissions` WHERE `name` = ?",
                [permissionName]
            );
        }

        console.log(`   🗑️  Removed ${allPermissions.length} permissions`);
        console.log("✅ Permission removal completed!");
    }
}

module.exports = SeedPermissions1700000000005;


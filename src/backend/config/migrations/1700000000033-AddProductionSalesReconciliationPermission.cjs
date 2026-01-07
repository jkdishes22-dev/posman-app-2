/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * @typedef {import("typeorm").MigrationInterface} MigrationInterface
 * @typedef {import("typeorm").QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Adds production-sales-reconciliation report permission to the database
 * and assigns it to admin, supervisor, and cashier roles
 */
class AddProductionSalesReconciliationPermission1700000000033 {
    constructor() {
        this.name = "AddProductionSalesReconciliationPermission1700000000033";
    }

    async up(queryRunner) {
        console.log("🔍 Adding production-sales-reconciliation report permission...");

        // Get financial scope ID (reports are financial operations)
        const scopes = await queryRunner.query(
            "SELECT id, name FROM `permission_scope` WHERE `name` = \"financial\""
        );

        if (scopes.length === 0) {
            console.log("   ⚠️  Warning: \"financial\" scope not found, cannot create permission");
            return;
        }

        const financialScopeId = scopes[0].id;

        // Permission to create
        const permissionName = "can_view_production_sales_reconciliation_report";

        // Check if permission already exists
        const existing = await queryRunner.query(
            "SELECT id, name FROM `permissions` WHERE `name` = ?",
            [permissionName]
        );

        let permissionId;

        if (existing.length === 0) {
            // Create the permission
            await queryRunner.query(
                `INSERT INTO \`permissions\` (\`name\`, \`scope_id\`, \`created_at\`, \`updated_at\`) 
                 VALUES (?, ?, NOW(), NULL)`,
                [permissionName, financialScopeId]
            );
            console.log(`   ✅ Created permission: ${permissionName}`);

            // Get the newly created permission ID
            const newPerm = await queryRunner.query(
                "SELECT id FROM `permissions` WHERE `name` = ?",
                [permissionName]
            );
            permissionId = newPerm[0].id;
        } else {
            console.log(`   ⏭️  Permission already exists: ${permissionName}`);
            permissionId = existing[0].id;
        }

        // Now assign permission to roles
        console.log("🔗 Assigning permission to roles...");

        // Get all role IDs
        const roles = await queryRunner.query(`SELECT id, name FROM \`roles\``);
        const roleMap = {};
        for (const role of roles) {
            roleMap[role.name] = role.id;
        }

        // Roles that should have this permission
        const roleNames = ["admin", "supervisor", "cashier"];

        let totalAssigned = 0;
        let totalSkipped = 0;

        // Assign permission to each role
        for (const roleName of roleNames) {
            const roleId = roleMap[roleName];

            if (!roleId) {
                console.log(`   ⚠️  Warning: Role "${roleName}" not found, skipping`);
                continue;
            }

            // Check if this role-permission link already exists
            const existing = await queryRunner.query(
                `SELECT id FROM \`role_permissions\` 
                 WHERE \`role_id\` = ? AND \`permission_id\` = ?`,
                [roleId, permissionId]
            );

            if (existing.length === 0) {
                // Create the role-permission link
                await queryRunner.query(
                    `INSERT INTO \`role_permissions\` 
                     (\`role_id\`, \`permission_id\`, \`created_at\`, \`updated_at\`) 
                     VALUES (?, ?, NOW(), NULL)`,
                    [roleId, permissionId]
                );
                totalAssigned++;
                console.log(`   ✅ Assigned "${permissionName}" to "${roleName}"`);
            } else {
                totalSkipped++;
                console.log(`   ⏭️  "${permissionName}" already assigned to "${roleName}"`);
            }
        }

        console.log(`   ✅ Assigned ${totalAssigned} new role-permission links`);
        if (totalSkipped > 0) {
            console.log(`   ⏭️  Skipped ${totalSkipped} existing role-permission links`);
        }
        console.log("✅ Production-sales-reconciliation permission setup completed!");
    }

    async down(queryRunner) {
        console.log("🔄 Removing production-sales-reconciliation permission...");

        const permissionName = "can_view_production_sales_reconciliation_report";

        // Get permission ID
        const permissions = await queryRunner.query(
            "SELECT id FROM `permissions` WHERE `name` = ?",
            [permissionName]
        );

        if (permissions.length === 0) {
            console.log("   ⚠️  Permission not found, nothing to remove");
            return;
        }

        const permissionId = permissions[0].id;

        // Remove role-permission links
        await queryRunner.query(
            `DELETE FROM \`role_permissions\` WHERE \`permission_id\` = ?`,
            [permissionId]
        );
        console.log(`   🗑️  Removed role-permission links for ${permissionName}`);

        // Remove the permission itself
        await queryRunner.query(
            "DELETE FROM `permissions` WHERE `id` = ?",
            [permissionId]
        );
        console.log(`   🗑️  Removed permission: ${permissionName}`);
        console.log("✅ Production-sales-reconciliation permission removal completed!");
    }
}

module.exports = AddProductionSalesReconciliationPermission1700000000033;


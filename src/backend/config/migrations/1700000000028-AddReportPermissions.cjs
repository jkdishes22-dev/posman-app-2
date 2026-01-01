/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Adds report permissions to the database and assigns them to cashier, supervisor, and admin roles
 * This migration creates the 8 report permissions and assigns them to the relevant roles
 */
class AddReportPermissions1700000000028 {
    constructor() {
        this.name = "AddReportPermissions1700000000028";
    }

    async up(queryRunner) {
        console.log("🔍 Ensuring report permissions exist...");

        // Get financial scope ID (reports are financial operations)
        const scopes = await queryRunner.query(
            "SELECT id, name FROM `permission_scope` WHERE `name` = 'financial'"
        );

        if (scopes.length === 0) {
            console.log("   ⚠️  Warning: 'financial' scope not found, cannot create permissions");
            return;
        }

        const financialScopeId = scopes[0].id;

        // Report permissions to ensure
        const reportPermissions = [
            { name: "can_view_sales_revenue_report", scopeId: financialScopeId },
            { name: "can_view_production_stock_revenue_report", scopeId: financialScopeId },
            { name: "can_view_items_sold_count_report", scopeId: financialScopeId },
            { name: "can_view_voided_items_report", scopeId: financialScopeId },
            { name: "can_view_expenditure_report", scopeId: financialScopeId },
            { name: "can_view_invoices_pending_bills_report", scopeId: financialScopeId },
            { name: "can_view_purchase_orders_report", scopeId: financialScopeId },
            { name: "can_view_pnl_report", scopeId: financialScopeId }
        ];

        const permissionMap = {};

        // Create permissions if they don't exist
        for (const perm of reportPermissions) {
            const existing = await queryRunner.query(
                "SELECT id, name FROM `permissions` WHERE `name` = ?",
                [perm.name]
            );

            if (existing.length === 0) {
                await queryRunner.query(
                    `INSERT INTO \`permissions\` (\`name\`, \`scope_id\`, \`created_at\`, \`updated_at\`) 
                     VALUES (?, ?, NOW(), NULL)`,
                    [perm.name, perm.scopeId]
                );
                console.log(`   ✅ Created permission: ${perm.name}`);

                // Get the newly created permission ID
                const newPerm = await queryRunner.query(
                    "SELECT id FROM `permissions` WHERE `name` = ?",
                    [perm.name]
                );
                permissionMap[perm.name] = newPerm[0].id;
            } else {
                console.log(`   ⏭️  Permission already exists: ${perm.name}`);
                permissionMap[perm.name] = existing[0].id;
            }
        }

        // Now assign permissions to roles
        console.log("🔗 Assigning report permissions to roles...");

        // Get all role IDs
        const roles = await queryRunner.query(`SELECT id, name FROM \`roles\``);
        const roleMap = {};
        for (const role of roles) {
            roleMap[role.name] = role.id;
        }

        // Role-permission mappings - all report permissions assigned to cashier, supervisor, and admin
        const rolePermissions = {
            cashier: [
                'can_view_sales_revenue_report',
                'can_view_production_stock_revenue_report',
                'can_view_items_sold_count_report',
                'can_view_voided_items_report', // Particularly relevant for cashiers
                'can_view_expenditure_report',
                'can_view_invoices_pending_bills_report',
                'can_view_purchase_orders_report',
                'can_view_pnl_report'
            ],
            supervisor: [
                'can_view_sales_revenue_report',
                'can_view_production_stock_revenue_report',
                'can_view_items_sold_count_report',
                'can_view_voided_items_report',
                'can_view_expenditure_report',
                'can_view_invoices_pending_bills_report',
                'can_view_purchase_orders_report',
                'can_view_pnl_report'
            ],
            admin: [
                'can_view_sales_revenue_report',
                'can_view_production_stock_revenue_report',
                'can_view_items_sold_count_report',
                'can_view_voided_items_report',
                'can_view_expenditure_report',
                'can_view_invoices_pending_bills_report',
                'can_view_purchase_orders_report',
                'can_view_pnl_report'
            ]
        };

        let totalAssigned = 0;
        let totalSkipped = 0;

        // Assign permissions to each role
        for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
            const roleId = roleMap[roleName];

            if (!roleId) {
                console.log(`   ⚠️  Warning: Role '${roleName}' not found, skipping`);
                continue;
            }

            for (const permissionName of permissionNames) {
                const permissionId = permissionMap[permissionName];

                if (!permissionId) {
                    console.log(`   ⚠️  Warning: Permission '${permissionName}' not found, skipping`);
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
                    console.log(`   ✅ Assigned '${permissionName}' to '${roleName}'`);
                } else {
                    totalSkipped++;
                    console.log(`   ⏭️  '${permissionName}' already assigned to '${roleName}'`);
                }
            }
        }

        console.log(`   ✅ Assigned ${totalAssigned} new role-permission links`);
        if (totalSkipped > 0) {
            console.log(`   ⏭️  Skipped ${totalSkipped} existing role-permission links`);
        }
        console.log("✅ Report permissions setup completed!");
    }

    async down(queryRunner) {
        console.log("🔄 Removing report permissions...");

        // Get permission IDs
        const permissions = await queryRunner.query(
            `SELECT id, name FROM \`permissions\` 
             WHERE \`name\` IN (
                 'can_view_sales_revenue_report',
                 'can_view_production_stock_revenue_report',
                 'can_view_items_sold_count_report',
                 'can_view_voided_items_report',
                 'can_view_expenditure_report',
                 'can_view_invoices_pending_bills_report',
                 'can_view_purchase_orders_report',
                 'can_view_pnl_report'
             )`
        );
        const permissionIds = permissions.map(p => p.id);

        if (permissionIds.length === 0) {
            console.log("   ⚠️  No report permissions found, nothing to remove");
            return;
        }

        // Remove role-permission links for report permissions
        if (permissionIds.length > 0) {
            await queryRunner.query(
                `DELETE FROM \`role_permissions\` 
                 WHERE \`permission_id\` IN (${permissionIds.map(() => '?').join(',')})`,
                permissionIds
            );
            console.log(`   🗑️  Removed role-permission links for ${permissionIds.length} report permissions`);
        }

        // Remove the permissions themselves
        for (const perm of permissions) {
            await queryRunner.query(
                "DELETE FROM `permissions` WHERE `id` = ?",
                [perm.id]
            );
        }

        console.log(`   🗑️  Removed ${permissions.length} report permissions`);
        console.log("✅ Report permissions removal completed!");
    }
}

module.exports = AddReportPermissions1700000000028;


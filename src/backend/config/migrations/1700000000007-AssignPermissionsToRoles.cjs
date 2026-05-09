/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Assigns permissions to roles based on ROLE_PERMISSIONS from role-permissions.ts
 * This ensures the database role_permissions table matches the configuration
 */
class AssignPermissionsToRoles1700000000007 {
    constructor() {
        this.name = 'AssignPermissionsToRoles1700000000007';
    }

    async up(queryRunner) {
        // Role-permission mappings from role-permissions.ts
        // This matches ROLE_PERMISSIONS exactly
        const rolePermissions = {
            admin: [
                // System management — full control
                'can_view_role',
                'can_add_role',
                'can_edit_role',
                'can_delete_role',
                'can_manage_role',
                'can_view_permission',
                'can_add_permission',
                'can_edit_permission',
                'can_delete_permission',
                'can_view_user',
                'can_add_user',
                'can_edit_user',
                'can_delete_user',
                'can_view_station',
                'can_add_station',
                'can_edit_station',
                'can_delete_station',
                'can_view_user_station',
                'can_add_user_station',
                'can_edit_user_station',
                'can_delete_user_station',
                'can_view_role_permission',
                'can_add_role_permission',
                'can_edit_role_permission',
                'can_delete_role_permission',
                'can_view_permission_scope',
                'can_edit_permission_scope',
                'can_delete_permission_scope',
                'can_view_pricelist',
                'can_add_pricelist',
                'can_edit_pricelist',
                'can_delete_pricelist',
                'can_view_category',
                'can_add_category',
                'can_edit_category',
                'can_delete_category',
                'can_view_item',
                'can_add_item',
                'can_edit_item',
                'can_delete_item',
                'can_view_station_pricelist',
                'can_add_station_pricelist',
                'can_edit_station_pricelist',
                'can_delete_station_pricelist',
                // Read-only access to business data (admin oversees but does not operate)
                'can_view_bill',
                'can_view_bill_item',
                'can_view_bill_payment',
                'can_view_inventory',
                'can_edit_inventory',
                'can_view_payment',
                'can_view_purchase_order',
                'can_view_supplier',
                'can_view_supplier_payment',
                'can_issue_production',
                'can_view_production_history'
            ],
            supervisor: [
                // Full billing management
                'can_view_bill',
                'can_add_bill',
                'can_edit_bill',
                'can_close_bill',
                'can_cancel_bill',
                'can_reopen_bill',
                'can_view_bill_item',
                'can_add_bill_item',
                'can_edit_bill_item',
                'can_delete_bill_item',
                'can_view_bill_payment',
                'can_add_bill_payment',
                'can_edit_bill_payment',
                'can_delete_bill_payment',
                // Full financial management
                'can_view_payment',
                'can_add_payment',
                'can_edit_payment',
                'can_delete_payment',
                // Catalogue access
                'can_view_pricelist',
                'can_view_category',
                'can_view_item',
                // Full inventory management
                'can_view_inventory',
                'can_add_inventory',
                'can_edit_inventory',
                'can_delete_inventory',
                'can_adjust_inventory',
                'can_add_item',
                'can_edit_item',
                'can_delete_item',
                'can_add_category',
                'can_edit_category',
                'can_delete_category',
                // Full supplier & purchase order management
                'can_view_supplier',
                'can_add_supplier',
                'can_edit_supplier',
                'can_delete_supplier',
                'can_view_supplier_payment',
                'can_add_supplier_payment',
                'can_edit_supplier_payment',
                'can_delete_supplier_payment',
                'can_view_purchase_order',
                'can_add_purchase_order',
                'can_edit_purchase_order',
                'can_delete_purchase_order',
                'can_receive_purchase_order',
                // Production
                'can_issue_production',
                'can_view_production_history',
                // Station oversight (incl. user–station assign/remove for Station Users)
                'can_view_station',
                'can_view_user_station',
                'can_edit_station',
                'can_view_station_pricelist',
                'can_edit_user_station',
                'can_add_user_station',
                'can_delete_user_station'
            ],
            sales: [
                // Bill creation and management (sales owns the order lifecycle)
                'can_view_bill',
                'can_add_bill',
                'can_edit_bill',
                'can_cancel_bill',
                'can_view_bill_item',
                'can_add_bill_item',
                'can_edit_bill_item',
                'can_delete_bill_item',
                // Payment entry (recording how customer will pay; cashier settles)
                'can_view_bill_payment',
                'can_add_bill_payment',
                'can_edit_bill_payment',
                'can_view_payment',
                'can_add_payment',
                'can_edit_payment',
                // Catalogue read access
                'can_view_pricelist',
                'can_view_category',
                'can_view_item',
                // Station access
                'can_view_station',
                'can_view_user_station'
            ],
            cashier: [
                // Bill visibility (cashier settles bills raised by sales)
                'can_view_bill',
                'can_view_bill_item',
                'can_view_bill_payment',
                // Core cashier action: close the bill once payment is fully received
                'can_close_bill',
                // Payment processing
                'can_add_bill_payment',
                'can_edit_bill_payment',
                'can_delete_bill_payment',
                'can_view_payment',
                'can_add_payment',
                'can_edit_payment',
                'can_delete_payment',
                // Station access
                'can_view_station',
                'can_view_user_station'
            ],
            storekeeper: [
                // Full inventory management
                'can_view_inventory',
                'can_add_inventory',
                'can_edit_inventory',
                'can_delete_inventory',
                'can_adjust_inventory',
                // Items and categories
                'can_view_item',
                'can_add_item',
                'can_edit_item',
                'can_delete_item',
                'can_view_category',
                'can_add_category',
                'can_edit_category',
                'can_delete_category',
                // Supplier management
                'can_view_supplier',
                'can_add_supplier',
                'can_edit_supplier',
                'can_delete_supplier',
                'can_view_supplier_payment',
                'can_add_supplier_payment',
                'can_edit_supplier_payment',
                'can_delete_supplier_payment',
                // Purchase orders
                'can_view_purchase_order',
                'can_add_purchase_order',
                'can_edit_purchase_order',
                'can_delete_purchase_order',
                'can_receive_purchase_order',
                // Production
                'can_issue_production',
                'can_view_production_history',
                // Station access
                'can_view_station',
                'can_view_user_station'
            ]
        };

        console.log('🔗 Assigning permissions to roles...');

        // Get all role IDs
        const roles = await queryRunner.query(`SELECT id, name FROM \`roles\``);
        const roleMap = {};
        for (const role of roles) {
            roleMap[role.name] = role.id;
        }

        // Get all permission IDs
        const permissions = await queryRunner.query(`SELECT id, name FROM \`permissions\``);
        const permissionMap = {};
        for (const perm of permissions) {
            permissionMap[perm.name] = perm.id;
        }

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
                } else {
                    totalSkipped++;
                }
            }
        }

        console.log(`   ✅ Assigned ${totalAssigned} new role-permission links`);
        if (totalSkipped > 0) {
            console.log(`   ⏭️  Skipped ${totalSkipped} existing role-permission links`);
        }
        console.log('✅ Role-permission assignment completed!');
    }

    async down(queryRunner) {
        console.log('🔄 Removing role-permission assignments...');

        // Remove all role-permission links
        // Note: This removes ALL role-permission links, not just the ones we added
        // In a production scenario, you might want to be more selective
        const result = await queryRunner.query(`DELETE FROM \`role_permissions\``);

        console.log(`   🗑️  Removed role-permission assignments`);
        console.log('✅ Role-permission removal completed!');
    }
}

module.exports = AssignPermissionsToRoles1700000000007;


/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Ensures production permissions exist in the database and are assigned to roles
 * This migration creates the permissions if they don't exist and assigns them to roles
 */
class EnsureProductionPermissionsExist1700000000018 {
    constructor() {
        this.name = "EnsureProductionPermissionsExist1700000000018";
    }

    async up(queryRunner) {
        console.log("🔍 Ensuring production permissions exist...");

        // Get inventory scope ID
        const scopes = await queryRunner.query(
            "SELECT id, name FROM `permission_scope` WHERE `name` = 'inventory'"
        );

        if (scopes.length === 0) {
            console.log("   ⚠️  Warning: 'inventory' scope not found, cannot create permissions");
            return;
        }

        const inventoryScopeId = scopes[0].id;

        // Production permissions to ensure
        const productionPermissions = [
            { name: "can_issue_production", scopeId: inventoryScopeId },
            { name: "can_view_production_history", scopeId: inventoryScopeId }
        ];

        const permissionMap = {};

        // Create permissions if they don't exist
        for (const perm of productionPermissions) {
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
        console.log("🔗 Assigning production permissions to roles...");

        // Get all role IDs
        const roles = await queryRunner.query(`SELECT id, name FROM \`roles\``);
        const roleMap = {};
        for (const role of roles) {
            roleMap[role.name] = role.id;
        }

        // Role-permission mappings
        const rolePermissions = {
            admin: [
                'can_view_production_history',
                'can_issue_production'
            ],
            supervisor: [
                'can_issue_production',
                'can_view_production_history'
            ],
            storekeeper: [
                'can_issue_production',
                'can_view_production_history'
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
        console.log("✅ Production permissions setup completed!");
    }

    async down(queryRunner) {
        console.log("🔄 Removing production permissions...");

        // Get permission IDs
        const permissions = await queryRunner.query(
            `SELECT id, name FROM \`permissions\` 
             WHERE \`name\` IN ('can_issue_production', 'can_view_production_history')`
        );
        const permissionIds = permissions.map(p => p.id);

        if (permissionIds.length === 0) {
            console.log("   ⚠️  No production permissions found, nothing to remove");
            return;
        }

        // Remove role-permission links for production permissions
        if (permissionIds.length > 0) {
            await queryRunner.query(
                `DELETE FROM \`role_permissions\` 
                 WHERE \`permission_id\` IN (${permissionIds.map(() => '?').join(',')})`,
                permissionIds
            );
        }

        // Remove the permissions themselves
        for (const perm of permissions) {
            await queryRunner.query(
                "DELETE FROM `permissions` WHERE `id` = ?",
                [perm.id]
            );
        }

        console.log(`   🗑️  Removed ${permissions.length} production permissions`);
        console.log("✅ Production permissions removal completed!");
    }
}

module.exports = EnsureProductionPermissionsExist1700000000018;


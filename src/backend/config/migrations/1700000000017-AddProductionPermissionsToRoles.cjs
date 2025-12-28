/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Adds production permissions (can_issue_production, can_view_production_history) to roles
 * This migration ensures production permissions are assigned to the appropriate roles
 */
class AddProductionPermissionsToRoles1700000000017 {
    constructor() {
        this.name = "AddProductionPermissionsToRoles1700000000017";
    }

    async up(queryRunner) {
        console.log("🔗 Adding production permissions to roles...");

        // Get all role IDs
        const roles = await queryRunner.query(`SELECT id, name FROM \`roles\``);
        const roleMap = {};
        for (const role of roles) {
            roleMap[role.name] = role.id;
        }

        // Get production permission IDs (check both exact match and case-insensitive)
        const permissions = await queryRunner.query(
            `SELECT id, name FROM \`permissions\` 
             WHERE \`name\` IN ('can_issue_production', 'can_view_production_history')
                OR LOWER(\`name\`) IN ('can_issue_production', 'can_view_production_history')`
        );
        const permissionMap = {};
        for (const perm of permissions) {
            permissionMap[perm.name] = perm.id;
        }

        // Role-permission mappings
        const rolePermissions = {
            admin: [
                'can_view_production_history' // Read-only for admin
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
        console.log("✅ Production permissions assignment completed!");
    }

    async down(queryRunner) {
        console.log("🔄 Removing production permissions from roles...");

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
        const result = await queryRunner.query(
            `DELETE FROM \`role_permissions\` 
             WHERE \`permission_id\` IN (${permissionIds.map(() => '?').join(',')})`,
            permissionIds
        );

        console.log(`   🗑️  Removed production permission assignments`);
        console.log("✅ Production permissions removal completed!");
    }
}

module.exports = AddProductionPermissionsToRoles1700000000017;


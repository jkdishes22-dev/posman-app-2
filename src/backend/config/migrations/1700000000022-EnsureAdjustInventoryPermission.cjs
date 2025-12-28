/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Ensures can_edit_inventory permission is assigned to admin role
 * This migration assigns can_edit_inventory to admin if not already assigned
 */
class EnsureAdjustInventoryPermission1700000000022 {
    constructor() {
        this.name = "EnsureAdjustInventoryPermission1700000000022";
    }

    async up(queryRunner) {
        console.log("🔍 Ensuring can_edit_inventory permission is assigned to admin role...");

        // Get inventory scope ID
        const scopes = await queryRunner.query(
            "SELECT id, name FROM `permission_scope` WHERE `name` = 'inventory'"
        );

        if (scopes.length === 0) {
            console.log("   ⚠️  Warning: 'inventory' scope not found");
            return;
        }

        // Check if can_edit_inventory permission exists
        const existing = await queryRunner.query(
            "SELECT id, name FROM `permissions` WHERE `name` = 'can_edit_inventory'"
        );

        if (existing.length === 0) {
            console.log("   ⚠️  Warning: 'can_edit_inventory' permission not found, cannot assign");
            return;
        }

        const permissionId = existing[0].id;

        // Get admin role ID
        const roles = await queryRunner.query(
            "SELECT id, name FROM `roles` WHERE `name` = 'admin'"
        );

        if (roles.length === 0) {
            console.log("   ⚠️  Warning: 'admin' role not found, cannot assign permission");
            return;
        }

        const adminRoleId = roles[0].id;

        // Check if this role-permission link already exists
        const existingLink = await queryRunner.query(
            `SELECT id FROM \`role_permissions\` 
             WHERE \`role_id\` = ? AND \`permission_id\` = ?`,
            [adminRoleId, permissionId]
        );

        if (existingLink.length === 0) {
            // Create the role-permission link
            await queryRunner.query(
                `INSERT INTO \`role_permissions\` 
                 (\`role_id\`, \`permission_id\`, \`created_at\`, \`updated_at\`) 
                 VALUES (?, ?, NOW(), NULL)`,
                [adminRoleId, permissionId]
            );
            console.log("   ✅ Assigned 'can_edit_inventory' to 'admin' role");
        } else {
            console.log("   ⏭️  'can_edit_inventory' already assigned to 'admin' role");
        }

        console.log("✅ can_edit_inventory permission assignment completed!");
    }

    async down(queryRunner) {
        console.log("🔄 Removing can_edit_inventory permission assignment from admin...");

        // Get permission ID
        const permissions = await queryRunner.query(
            "SELECT id FROM `permissions` WHERE `name` = 'can_edit_inventory'"
        );

        if (permissions.length === 0) {
            console.log("   ⚠️  Permission 'can_edit_inventory' not found");
            return;
        }

        const permissionId = permissions[0].id;

        // Get admin role ID
        const roles = await queryRunner.query(
            "SELECT id FROM `roles` WHERE `name` = 'admin'"
        );

        if (roles.length === 0) {
            console.log("   ⚠️  Role 'admin' not found");
            return;
        }

        const adminRoleId = roles[0].id;

        // Remove role-permission link
        await queryRunner.query(
            `DELETE FROM \`role_permissions\` 
             WHERE \`role_id\` = ? AND \`permission_id\` = ?`,
            [adminRoleId, permissionId]
        );

        console.log("   🗑️  Removed 'can_edit_inventory' from 'admin' role");
        console.log("✅ can_edit_inventory permission removal completed!");
    }
}

module.exports = EnsureAdjustInventoryPermission1700000000022;


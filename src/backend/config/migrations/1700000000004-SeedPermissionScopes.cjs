/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Seeds PermissionScopes based on PERMISSION_CATEGORIES from role-permissions.ts
 * Scopes: system, billing, financial, inventory, stations, pricelists
 */
class SeedPermissionScopes1700000000004 {
    constructor() {
        this.name = 'SeedPermissionScopes1700000000004';
    }

    async up(queryRunner) {
        // Permission scopes based on PERMISSION_CATEGORIES
        const scopes = [
            { name: 'system', description: 'System management permissions (roles, users, permissions)' },
            { name: 'billing', description: 'Billing and invoice management permissions' },
            { name: 'financial', description: 'Financial operations and payment processing' },
            { name: 'inventory', description: 'Inventory, items, and category management' },
            { name: 'stations', description: 'Station and user-station assignment management' },
            { name: 'pricelists', description: 'Pricelist management permissions' }
        ];

        console.log('🌱 Seeding permission scopes...');

        for (const scope of scopes) {
            // Check if scope already exists
            const existingScope = await queryRunner.query(
                `SELECT id FROM \`permission_scope\` WHERE \`name\` = ?`,
                [scope.name]
            );

            if (existingScope.length === 0) {
                // Insert scope with current timestamp
                await queryRunner.query(
                    `INSERT INTO \`permission_scope\` (\`name\`, \`created_at\`, \`updated_at\`) 
                     VALUES (?, NOW(), NULL)`,
                    [scope.name]
                );
                console.log(`   ✅ Created scope: ${scope.name}`);
            } else {
                console.log(`   ⏭️  Scope already exists: ${scope.name}`);
            }
        }

        console.log('✅ Permission scope seeding completed!');
    }

    async down(queryRunner) {
        // Remove seeded scopes
        const scopes = ['system', 'billing', 'financial', 'inventory', 'stations', 'pricelists'];
        
        console.log('🔄 Removing seeded permission scopes...');

        for (const scopeName of scopes) {
            await queryRunner.query(
                `DELETE FROM \`permission_scope\` WHERE \`name\` = ?`,
                [scopeName]
            );
            console.log(`   🗑️  Removed scope: ${scopeName}`);
        }

        console.log('✅ Permission scope removal completed!');
    }
}

module.exports = SeedPermissionScopes1700000000004;


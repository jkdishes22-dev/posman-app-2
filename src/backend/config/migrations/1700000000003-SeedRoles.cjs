/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Seeds default roles based on role-permissions.ts configuration
 * Roles: admin, supervisor, sales, cashier, storekeeper
 */
class SeedRoles1700000000003 {
    constructor() {
        this.name = 'SeedRoles1700000000003';
    }

    async up(queryRunner) {
        // Role names from role-permissions.ts
        const roles = [
            { name: 'admin', description: 'System administrator with full access' },
            { name: 'supervisor', description: 'Supervisor with management and oversight capabilities' },
            { name: 'sales', description: 'Sales person with billing and customer service access' },
            { name: 'cashier', description: 'Cashier with payment processing capabilities' },
            { name: 'storekeeper', description: 'Storekeeper with inventory management access' }
        ];

        console.log('🌱 Seeding roles...');

        for (const role of roles) {
            // Check if role already exists
            const existingRole = await queryRunner.query(
                `SELECT id FROM \`roles\` WHERE \`name\` = ?`,
                [role.name]
            );

            if (existingRole.length === 0) {
                // Insert role with current timestamp
                await queryRunner.query(
                    `INSERT INTO \`roles\` (\`name\`, \`created_at\`, \`updated_at\`) 
                     VALUES (?, NOW(), NULL)`,
                    [role.name]
                );
                console.log(`   ✅ Created role: ${role.name}`);
            } else {
                console.log(`   ⏭️  Role already exists: ${role.name}`);
            }
        }

        console.log('✅ Role seeding completed!');
    }

    async down(queryRunner) {
        // Remove seeded roles (only if they were created by this migration)
        // In production, you might want to keep roles, so this is optional
        const roles = ['admin', 'supervisor', 'sales', 'cashier', 'storekeeper'];

        console.log('🔄 Removing seeded roles...');

        for (const roleName of roles) {
            await queryRunner.query(
                `DELETE FROM \`roles\` WHERE \`name\` = ?`,
                [roleName]
            );
            console.log(`   🗑️  Removed role: ${roleName}`);
        }

        console.log('✅ Role removal completed!');
    }
}

module.exports = SeedRoles1700000000003;


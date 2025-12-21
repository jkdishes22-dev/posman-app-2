/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");
const bcrypt = require("bcryptjs");
require("dotenv").config();

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Seeds an initial admin user for first-time login.
 * This user has admin role with minimal privileges needed for initial setup.
 * 
 * Default credentials (should be changed on first login):
 * - Username: admin (or from ADMIN_USERNAME env var)
 * - Password: admin123 (or from ADMIN_PASSWORD env var)
 * 
 * Security: The password is hashed using bcrypt (10 rounds).
 * The user should change the password immediately after first login.
 */
class SeedAdminUser1700000000006 {
    constructor() {
        this.name = 'SeedAdminUser1700000000006';
    }

    async up(queryRunner) {
        // Get admin credentials from environment or use secure defaults
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const adminFirstName = process.env.ADMIN_FIRST_NAME || 'System';
        const adminLastName = process.env.ADMIN_LAST_NAME || 'Administrator';

        console.log('🌱 Seeding admin user...');
        console.log(`   Username: ${adminUsername}`);

        // Check if admin user already exists
        const existingUser = await queryRunner.query(
            `SELECT id FROM \`user\` WHERE \`username\` = ?`,
            [adminUsername]
        );

        if (existingUser.length > 0) {
            console.log(`   ⏭️  Admin user '${adminUsername}' already exists, skipping creation`);
            return;
        }

        // Hash the password using bcrypt (10 rounds, matching User entity)
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Get admin role ID
        const adminRole = await queryRunner.query(
            `SELECT id FROM \`roles\` WHERE \`name\` = ?`,
            ['admin']
        );

        if (adminRole.length === 0) {
            throw new Error('Admin role not found. Please run SeedRoles migration first.');
        }

        const adminRoleId = adminRole[0].id;

        // Insert admin user
        const insertResult = await queryRunner.query(
            `INSERT INTO \`user\` (
                \`username\`, 
                \`firstName\`, 
                \`lastName\`, 
                \`password\`, 
                \`status\`, 
                \`is_locked\`, 
                \`created_at\`, 
                \`updated_at\`
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NULL)`,
            [
                adminUsername,
                adminFirstName,
                adminLastName,
                hashedPassword,
                'ACTIVE',
                false
            ]
        );

        const userId = insertResult.insertId;

        // Assign admin role to the user
        await queryRunner.query(
            `INSERT INTO \`user_roles\` (
                \`user_id\`, 
                \`role_id\`, 
                \`created_at\`, 
                \`updated_at\`
            ) VALUES (?, ?, NOW(), NULL)`,
            [userId, adminRoleId]
        );

        console.log(`   ✅ Created admin user: ${adminUsername}`);
        console.log(`   ⚠️  IMPORTANT: Change the default password immediately after first login!`);
        console.log(`   📝 Default password: ${adminPassword}`);
    }

    async down(queryRunner) {
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';

        console.log('🔄 Removing admin user...');

        // Get user ID
        const user = await queryRunner.query(
            `SELECT id FROM \`user\` WHERE \`username\` = ?`,
            [adminUsername]
        );

        if (user.length === 0) {
            console.log(`   ⏭️  Admin user '${adminUsername}' not found, nothing to remove`);
            return;
        }

        const userId = user[0].id;

        // Remove user roles
        await queryRunner.query(
            `DELETE FROM \`user_roles\` WHERE \`user_id\` = ?`,
            [userId]
        );

        // Remove user
        await queryRunner.query(
            `DELETE FROM \`user\` WHERE \`id\` = ?`,
            [userId]
        );

        console.log(`   🗑️  Removed admin user: ${adminUsername}`);
        console.log('✅ Admin user removal completed!');
    }
}

module.exports = SeedAdminUser1700000000006;


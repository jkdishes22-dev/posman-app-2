/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 *
 * Migration: Add User Performance Indexes
 *
 * This migration adds indexes to improve the performance of user-related queries,
 * especially for login and user lookup operations.
 */
class AddUserPerformanceIndexes1700000000026 {
    constructor() {
        this.name = "AddUserPerformanceIndexes1700000000026";
    }

    async up(queryRunner) {
        console.log("🔄 Adding user performance indexes...");

        // Check if index already exists
        const checkIndex = async (tableName, indexName) => {
            const result = await queryRunner.query(`
                SELECT COUNT(*) as count
                FROM INFORMATION_SCHEMA.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = '${tableName}'
                AND INDEX_NAME = '${indexName}'
            `);
            return result[0].count > 0;
        };

        // Add unique index on username for fast login lookups
        if (!(await checkIndex("user", "IDX_user_username"))) {
            console.log("   ➕ Adding unique index on user.username...");
            await queryRunner.query(`
                CREATE UNIQUE INDEX \`IDX_user_username\` ON \`user\` (\`username\`)
            `);
            console.log("   ✅ Added unique index on user.username");
        } else {
            console.log("   ⏭️  Index IDX_user_username already exists");
        }

        // Add index on refreshToken for fast refresh token lookups
        if (!(await checkIndex("user", "IDX_user_refresh_token"))) {
            console.log("   ➕ Adding index on user.refreshToken...");
            await queryRunner.query(`
                CREATE INDEX \`IDX_user_refresh_token\` ON \`user\` (\`refreshToken\`)
            `);
            console.log("   ✅ Added index on user.refreshToken");
        } else {
            console.log("   ⏭️  Index IDX_user_refresh_token already exists");
        }

        // Add index on status for filtering active users
        if (!(await checkIndex("user", "IDX_user_status"))) {
            console.log("   ➕ Adding index on user.status...");
            await queryRunner.query(`
                CREATE INDEX \`IDX_user_status\` ON \`user\` (\`status\`)
            `);
            console.log("   ✅ Added index on user.status");
        } else {
            console.log("   ⏭️  Index IDX_user_status already exists");
        }

        console.log("✅ User performance indexes added!");
    }

    async down(queryRunner) {
        console.log("🔄 Reverting user performance indexes...");

        await queryRunner.query(`
            DROP INDEX IF EXISTS \`IDX_user_username\` ON \`user\`
        `);
        console.log("   ➖ Dropped index on user.username");

        await queryRunner.query(`
            DROP INDEX IF EXISTS \`IDX_user_refresh_token\` ON \`user\`
        `);
        console.log("   ➖ Dropped index on user.refreshToken");

        await queryRunner.query(`
            DROP INDEX IF EXISTS \`IDX_user_status\` ON \`user\`
        `);
        console.log("   ➖ Dropped index on user.status");

        console.log("✅ User performance indexes reverted!");
    }
}

module.exports = AddUserPerformanceIndexes1700000000026;


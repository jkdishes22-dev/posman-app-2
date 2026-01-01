const { MigrationInterface, QueryRunner } = require("typeorm");

/**
 * Migration: Add code fields to pricelist and category tables
 * 
 * This migration adds unique code fields to pricelist and category tables
 * to support better matching and identification in the upload system.
 */
module.exports = class AddCodeFieldsToPricelistAndCategory1700000000030 {
    name = 'AddCodeFieldsToPricelistAndCategory1700000000030'

    async up(queryRunner) {
        // Check if code column already exists in pricelist table
        const checkPricelistColumn = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'pricelist'
            AND COLUMN_NAME = 'code'
        `);

        if (checkPricelistColumn[0].count === 0) {
            await queryRunner.query(`
                ALTER TABLE \`pricelist\` 
                ADD COLUMN \`code\` VARCHAR(255) NULL
            `);

            // Add unique index on code
            await queryRunner.query(`
                CREATE UNIQUE INDEX \`IDX_pricelist_code\` ON \`pricelist\` (\`code\`)
            `);

            console.log("Added code column to pricelist table");
        } else {
            console.log("Column code already exists in pricelist table");
        }

        // Check if code column already exists in category table
        const checkCategoryColumn = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'category'
            AND COLUMN_NAME = 'code'
        `);

        if (checkCategoryColumn[0].count === 0) {
            await queryRunner.query(`
                ALTER TABLE \`category\` 
                ADD COLUMN \`code\` VARCHAR(255) NULL
            `);

            // Add unique index on code
            await queryRunner.query(`
                CREATE UNIQUE INDEX \`IDX_category_code\` ON \`category\` (\`code\`)
            `);

            console.log("Added code column to category table");
        } else {
            console.log("Column code already exists in category table");
        }
    }

    async down(queryRunner) {
        // Check if code column exists in pricelist table before dropping
        const checkPricelistColumn = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'pricelist'
            AND COLUMN_NAME = 'code'
        `);

        if (checkPricelistColumn[0].count > 0) {
            // Drop index first
            await queryRunner.query(`
                DROP INDEX \`IDX_pricelist_code\` ON \`pricelist\`
            `);

            await queryRunner.query(`
                ALTER TABLE \`pricelist\` 
                DROP COLUMN \`code\`
            `);

            console.log("Dropped code column from pricelist table");
        } else {
            console.log("Column code does not exist in pricelist table");
        }

        // Check if code column exists in category table before dropping
        const checkCategoryColumn = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'category'
            AND COLUMN_NAME = 'code'
        `);

        if (checkCategoryColumn[0].count > 0) {
            // Drop index first
            await queryRunner.query(`
                DROP INDEX \`IDX_category_code\` ON \`category\`
            `);

            await queryRunner.query(`
                ALTER TABLE \`category\` 
                DROP COLUMN \`code\`
            `);

            console.log("Dropped code column from category table");
        } else {
            console.log("Column code does not exist in category table");
        }
    }
}


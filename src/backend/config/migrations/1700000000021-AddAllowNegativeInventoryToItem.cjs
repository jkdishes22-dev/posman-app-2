const { MigrationInterface, QueryRunner } = require("typeorm");

/**
 * Migration: Add allow_negative_inventory column to item table
 * 
 * This migration adds a flag to allow certain items to go into negative inventory
 * when sold, bypassing the normal negative inventory prevention.
 */
module.exports = class AddAllowNegativeInventoryToItem1700000000021 {
    name = 'AddAllowNegativeInventoryToItem1700000000021'

    async up(queryRunner) {
        // Check if column already exists
        const checkColumn = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'item'
            AND COLUMN_NAME = 'allow_negative_inventory'
        `);

        if (checkColumn[0].count === 0) {
            await queryRunner.query(`
                ALTER TABLE \`item\` 
                ADD COLUMN \`allow_negative_inventory\` TINYINT(1) NULL DEFAULT 0
            `);
            console.log("Added allow_negative_inventory column to item table");
        } else {
            console.log("Column allow_negative_inventory already exists in item table");
        }
    }

    async down(queryRunner) {
        // Check if column exists before dropping
        const checkColumn = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'item'
            AND COLUMN_NAME = 'allow_negative_inventory'
        `);

        if (checkColumn[0].count > 0) {
            await queryRunner.query(`
                ALTER TABLE \`item\` 
                DROP COLUMN \`allow_negative_inventory\`
            `);
            console.log("Dropped allow_negative_inventory column from item table");
        } else {
            console.log("Column allow_negative_inventory does not exist in item table");
        }
    }
}


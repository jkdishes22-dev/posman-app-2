/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Migration: Create inventory table
 * 
 * Creates the inventory table with quantity and reserved_quantity fields.
 * The reserved_quantity field prevents race conditions by tracking stock
 * reserved by draft bills. Available stock = quantity - reserved_quantity.
 */
class CreateInventoryTable1700000000011 {
    constructor() {
        this.name = "CreateInventoryTable1700000000011";
    }

    async up(queryRunner) {
        // Create inventory table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`inventory\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`item_id\` int unsigned NOT NULL,
                \`quantity\` int NOT NULL DEFAULT 0,
                \`reserved_quantity\` int NOT NULL DEFAULT 0,
                \`min_stock_level\` int DEFAULT NULL,
                \`max_stock_level\` int DEFAULT NULL,
                \`reorder_point\` int DEFAULT NULL,
                \`last_restocked_at\` datetime DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_inventory_item_id\` (\`item_id\`),
                KEY \`IDX_inventory_item_id\` (\`item_id\`),
                KEY \`IDX_inventory_quantity\` (\`quantity\`),
                CONSTRAINT \`FK_inventory_item\` FOREIGN KEY (\`item_id\`) 
                    REFERENCES \`item\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }

    async down(queryRunner) {
        // Drop inventory table
        await queryRunner.query(`
            DROP TABLE IF EXISTS \`inventory\`
        `);
    }
}

module.exports = CreateInventoryTable1700000000011;


/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Migration: Create inventory_transaction table
 * 
 * Creates the inventory_transaction table for audit trail of all inventory movements.
 * Tracks reservations, deductions, additions, and adjustments.
 */
class CreateInventoryTransactionTable1700000000013 {
    constructor() {
        this.name = "CreateInventoryTransactionTable1700000000013";
    }

    async up(queryRunner) {
        // Create inventory_transaction table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`inventory_transaction\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`item_id\` int unsigned NOT NULL,
                \`transaction_type\` enum('sale','purchase','adjustment','transfer','return') NOT NULL,
                \`quantity\` int NOT NULL,
                \`reference_type\` enum('bill','purchase_order','manual_adjustment') DEFAULT NULL,
                \`reference_id\` int unsigned DEFAULT NULL,
                \`notes\` text DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_inventory_transaction_item_id\` (\`item_id\`),
                KEY \`IDX_inventory_transaction_type\` (\`transaction_type\`),
                KEY \`IDX_inventory_transaction_reference_type\` (\`reference_type\`),
                KEY \`IDX_inventory_transaction_created_at\` (\`created_at\`),
                CONSTRAINT \`FK_inventory_transaction_item\` FOREIGN KEY (\`item_id\`) 
                    REFERENCES \`item\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }

    async down(queryRunner) {
        // Drop inventory_transaction table
        await queryRunner.query(`
            DROP TABLE IF EXISTS \`inventory_transaction\`
        `);
    }
}

module.exports = CreateInventoryTransactionTable1700000000013;


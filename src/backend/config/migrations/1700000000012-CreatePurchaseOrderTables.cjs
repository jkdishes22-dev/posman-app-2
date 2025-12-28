/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Migration: Create purchase_order and purchase_order_item tables
 * 
 * Creates tables for managing purchase orders and their items.
 */
class CreatePurchaseOrderTables1700000000012 {
    constructor() {
        this.name = "CreatePurchaseOrderTables1700000000012";
    }

    async up(queryRunner) {
        // Create purchase_order table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`purchase_order\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`supplier_id\` int unsigned NOT NULL,
                \`order_number\` varchar(100) NOT NULL,
                \`order_date\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`expected_delivery_date\` datetime DEFAULT NULL,
                \`status\` enum('draft','sent','partial','received','cancelled') NOT NULL DEFAULT 'draft',
                \`total_amount\` decimal(10,2) NOT NULL DEFAULT 0.00,
                \`notes\` text DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_purchase_order_order_number\` (\`order_number\`),
                KEY \`IDX_purchase_order_status\` (\`status\`),
                KEY \`IDX_purchase_order_supplier_id\` (\`supplier_id\`),
                CONSTRAINT \`FK_purchase_order_supplier\` FOREIGN KEY (\`supplier_id\`) 
                    REFERENCES \`supplier\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create purchase_order_item table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`purchase_order_item\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`purchase_order_id\` int unsigned NOT NULL,
                \`item_id\` int unsigned NOT NULL,
                \`quantity_ordered\` int NOT NULL,
                \`quantity_received\` int NOT NULL DEFAULT 0,
                \`unit_price\` decimal(10,2) NOT NULL,
                \`subtotal\` decimal(10,2) NOT NULL DEFAULT 0.00,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_purchase_order_item_po_id\` (\`purchase_order_id\`),
                KEY \`IDX_purchase_order_item_item_id\` (\`item_id\`),
                CONSTRAINT \`FK_purchase_order_item_po\` FOREIGN KEY (\`purchase_order_id\`) 
                    REFERENCES \`purchase_order\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`FK_purchase_order_item_item\` FOREIGN KEY (\`item_id\`) 
                    REFERENCES \`item\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }

    async down(queryRunner) {
        // Drop purchase_order_item table first (due to foreign key)
        await queryRunner.query(`
            DROP TABLE IF EXISTS \`purchase_order_item\`
        `);

        // Drop purchase_order table
        await queryRunner.query(`
            DROP TABLE IF EXISTS \`purchase_order\`
        `);
    }
}

module.exports = CreatePurchaseOrderTables1700000000012;


/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Migration: Create supplier_payment and supplier_transaction tables
 * 
 * Creates normalized tables for tracking supplier financial transactions.
 * This follows the same pattern as Payment/BillPayment for bills.
 * Balances are calculated from transactions, not stored directly.
 */
class CreateSupplierPaymentTables1700000000014 {
    constructor() {
        this.name = "CreateSupplierPaymentTables1700000000014";
    }

    async up(queryRunner) {
        // Create supplier_payment table (links payments to suppliers)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`supplier_payment\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`supplier_id\` int unsigned NOT NULL,
                \`payment_id\` int unsigned NOT NULL,
                \`amount_paid\` decimal(10,2) NOT NULL DEFAULT 0.00,
                \`amount_received\` decimal(10,2) NOT NULL DEFAULT 0.00,
                \`reference\` varchar(255) DEFAULT NULL,
                \`notes\` text DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_supplier_payment_supplier_id\` (\`supplier_id\`),
                KEY \`IDX_supplier_payment_payment_id\` (\`payment_id\`),
                KEY \`IDX_supplier_payment_created_at\` (\`created_at\`),
                CONSTRAINT \`FK_supplier_payment_supplier\` FOREIGN KEY (\`supplier_id\`) 
                    REFERENCES \`supplier\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT \`FK_supplier_payment_payment\` FOREIGN KEY (\`payment_id\`) 
                    REFERENCES \`payment\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create supplier_transaction table (audit trail for all supplier financial transactions)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`supplier_transaction\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`supplier_id\` int unsigned NOT NULL,
                \`transaction_type\` enum('purchase_order','payment','return','refund','adjustment','credit_note') NOT NULL,
                \`debit_amount\` decimal(10,2) NOT NULL DEFAULT 0.00,
                \`credit_amount\` decimal(10,2) NOT NULL DEFAULT 0.00,
                \`reference_type\` enum('purchase_order','payment','return','refund','adjustment','credit_note') DEFAULT NULL,
                \`reference_id\` int unsigned DEFAULT NULL,
                \`notes\` text DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_supplier_transaction_supplier_id\` (\`supplier_id\`),
                KEY \`IDX_supplier_transaction_type\` (\`transaction_type\`),
                KEY \`IDX_supplier_transaction_reference_type\` (\`reference_type\`),
                KEY \`IDX_supplier_transaction_created_at\` (\`created_at\`),
                CONSTRAINT \`FK_supplier_transaction_supplier\` FOREIGN KEY (\`supplier_id\`) 
                    REFERENCES \`supplier\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }

    async down(queryRunner) {
        // Drop supplier_transaction table first (due to foreign key)
        await queryRunner.query(`
            DROP TABLE IF EXISTS \`supplier_transaction\`
        `);

        // Drop supplier_payment table
        await queryRunner.query(`
            DROP TABLE IF EXISTS \`supplier_payment\`
        `);
    }
}

module.exports = CreateSupplierPaymentTables1700000000014;


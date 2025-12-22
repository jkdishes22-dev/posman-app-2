/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Migration: Create supplier table
 * 
 * Creates the supplier table with all required fields for supplier management.
 */
class CreateSupplierTable1700000000010 {
    constructor() {
        this.name = "CreateSupplierTable1700000000010";
    }

    async up(queryRunner) {
        // Create supplier table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`supplier\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`name\` varchar(255) NOT NULL,
                \`contact_person\` varchar(255) DEFAULT NULL,
                \`email\` varchar(255) DEFAULT NULL,
                \`phone\` varchar(50) DEFAULT NULL,
                \`address\` text DEFAULT NULL,
                \`credit_limit\` decimal(10,2) NOT NULL DEFAULT 0.00,
                \`payment_terms\` varchar(255) DEFAULT NULL,
                \`status\` enum('active','inactive') NOT NULL DEFAULT 'active',
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_supplier_status\` (\`status\`),
                KEY \`IDX_supplier_name\` (\`name\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }

    async down(queryRunner) {
        // Drop supplier table
        await queryRunner.query(`
            DROP TABLE IF EXISTS \`supplier\`
        `);
    }
}

module.exports = CreateSupplierTable1700000000010;


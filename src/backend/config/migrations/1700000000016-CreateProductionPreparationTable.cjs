/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Migration: Create production_preparation table
 * 
 * Creates table for tracking chef preparations that require supervisor approval.
 * Supports workflow: Chef prepares → Supervisor approves/rejects → Items added to inventory.
 */
class CreateProductionPreparationTable1700000000016 {
    constructor() {
        this.name = "CreateProductionPreparationTable1700000000016";
    }

    async up(queryRunner) {
        // Create production_preparation table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`production_preparation\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`item_id\` int unsigned NOT NULL,
                \`quantity_prepared\` int NOT NULL,
                \`status\` enum('pending','approved','rejected','issued') NOT NULL DEFAULT 'pending',
                \`prepared_by\` int unsigned DEFAULT NULL,
                \`prepared_at\` datetime DEFAULT NULL,
                \`issued_by\` int unsigned DEFAULT NULL,
                \`issued_at\` datetime DEFAULT NULL,
                \`notes\` text DEFAULT NULL,
                \`rejection_reason\` text DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_production_preparation_item_id\` (\`item_id\`),
                KEY \`IDX_production_preparation_status\` (\`status\`),
                KEY \`IDX_production_preparation_prepared_by\` (\`prepared_by\`),
                KEY \`IDX_production_preparation_prepared_at\` (\`prepared_at\`),
                CONSTRAINT \`FK_production_preparation_item\` FOREIGN KEY (\`item_id\`) 
                    REFERENCES \`item\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT \`FK_production_preparation_prepared_by\` FOREIGN KEY (\`prepared_by\`) 
                    REFERENCES \`user\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT \`FK_production_preparation_issued_by\` FOREIGN KEY (\`issued_by\`) 
                    REFERENCES \`user\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }

    async down(queryRunner) {
        // Drop production_preparation table
        await queryRunner.query(`
            DROP TABLE IF EXISTS \`production_preparation\`
        `);
    }
}

module.exports = CreateProductionPreparationTable1700000000016;


/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Migration: Create production_issue table
 * 
 * Creates table for tracking production issues (passive production tracking).
 * Supervisor records "X items produced" without tracking input ingredients.
 */
class CreateProductionIssueTable1700000000015 {
    constructor() {
        this.name = "CreateProductionIssueTable1700000000015";
    }

    async up(queryRunner) {
        // Create production_issue table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`production_issue\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`item_id\` int unsigned NOT NULL,
                \`quantity_produced\` int NOT NULL,
                \`status\` enum('draft','completed','cancelled') NOT NULL DEFAULT 'draft',
                \`issued_by\` int unsigned DEFAULT NULL,
                \`issued_at\` datetime DEFAULT NULL,
                \`notes\` text DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_production_issue_item_id\` (\`item_id\`),
                KEY \`IDX_production_issue_status\` (\`status\`),
                KEY \`IDX_production_issue_issued_by\` (\`issued_by\`),
                KEY \`IDX_production_issue_issued_at\` (\`issued_at\`),
                CONSTRAINT \`FK_production_issue_item\` FOREIGN KEY (\`item_id\`) 
                    REFERENCES \`item\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT \`FK_production_issue_user\` FOREIGN KEY (\`issued_by\`) 
                    REFERENCES \`user\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }

    async down(queryRunner) {
        // Drop production_issue table
        await queryRunner.query(`
            DROP TABLE IF EXISTS \`production_issue\`
        `);
    }
}

module.exports = CreateProductionIssueTable1700000000015;


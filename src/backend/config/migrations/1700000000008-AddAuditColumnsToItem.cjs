/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Migration: Add audit columns to item table
 * 
 * The item table was created without the audit columns (created_at, updated_at, created_by, updated_by)
 * that are defined in BaseEntity. This migration adds these columns to maintain consistency
 * with other entities that extend BaseEntity.
 */
class AddAuditColumnsToItem1700000000008 {
    constructor() {
        this.name = "AddAuditColumnsToItem1700000000008";
    }

    async up(queryRunner) {
        // Add audit columns to item table
        await queryRunner.query(`
            ALTER TABLE \`item\`
            ADD COLUMN \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN \`updated_at\` datetime NULL,
            ADD COLUMN \`created_by\` int unsigned NULL,
            ADD COLUMN \`updated_by\` int unsigned NULL
        `);

        // Add index on created_at for better query performance
        await queryRunner.query(`
            CREATE INDEX \`IDX_item_created_at\` ON \`item\` (\`created_at\`)
        `);
    }

    async down(queryRunner) {
        // Remove index
        await queryRunner.query(`
            DROP INDEX \`IDX_item_created_at\` ON \`item\`
        `);

        // Remove audit columns
        await queryRunner.query(`
            ALTER TABLE \`item\`
            DROP COLUMN \`created_at\`,
            DROP COLUMN \`updated_at\`,
            DROP COLUMN \`created_by\`,
            DROP COLUMN \`updated_by\`
        `);
    }
}

module.exports = AddAuditColumnsToItem1700000000008;


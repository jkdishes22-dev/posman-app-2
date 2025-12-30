/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Migration: Add audit columns to reopen_reasons table
 * 
 * The reopen_reasons table was created with created_at and updated_at but without created_by and updated_by
 * columns that are defined in BaseEntity. This migration adds these columns to maintain consistency
 * with other entities that extend BaseEntity.
 */
class AddAuditColumnsToReopenReason1700000000024 {
    constructor() {
        this.name = "AddAuditColumnsToReopenReason1700000000024";
    }

    async up(queryRunner) {
        // Check if columns already exist before adding them
        const checkCreatedBy = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'reopen_reasons'
            AND COLUMN_NAME = 'created_by'
        `);

        const checkUpdatedBy = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'reopen_reasons'
            AND COLUMN_NAME = 'updated_by'
        `);

        if (checkCreatedBy[0].count === 0) {
            await queryRunner.query(`
                ALTER TABLE \`reopen_reasons\`
                ADD COLUMN \`created_by\` int unsigned NULL
            `);
        }

        if (checkUpdatedBy[0].count === 0) {
            await queryRunner.query(`
                ALTER TABLE \`reopen_reasons\`
                ADD COLUMN \`updated_by\` int unsigned NULL
            `);
        }
    }

    async down(queryRunner) {
        // Check if columns exist before removing them
        const checkCreatedBy = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'reopen_reasons'
            AND COLUMN_NAME = 'created_by'
        `);

        const checkUpdatedBy = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'reopen_reasons'
            AND COLUMN_NAME = 'updated_by'
        `);

        if (checkCreatedBy[0].count > 0) {
            await queryRunner.query(`
                ALTER TABLE \`reopen_reasons\`
                DROP COLUMN \`created_by\`
            `);
        }

        if (checkUpdatedBy[0].count > 0) {
            await queryRunner.query(`
                ALTER TABLE \`reopen_reasons\`
                DROP COLUMN \`updated_by\`
            `);
        }
    }
}

module.exports = AddAuditColumnsToReopenReason1700000000024;


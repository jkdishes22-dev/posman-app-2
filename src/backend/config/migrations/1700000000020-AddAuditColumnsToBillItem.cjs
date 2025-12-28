/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Migration: Add audit columns to bill_item table
 * 
 * The bill_item table was created with created_at and updated_at but without created_by and updated_by
 * columns that are defined in BaseEntity. This migration adds these columns to maintain consistency
 * with other entities that extend BaseEntity.
 */
class AddAuditColumnsToBillItem1700000000020 {
    constructor() {
        this.name = "AddAuditColumnsToBillItem1700000000020";
    }

    async up(queryRunner) {
        // Check if columns already exist before adding them
        const checkCreatedBy = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'bill_item'
            AND COLUMN_NAME = 'created_by'
        `);

        const checkUpdatedBy = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'bill_item'
            AND COLUMN_NAME = 'updated_by'
        `);

        if (checkCreatedBy[0].count === 0) {
            await queryRunner.query(`
                ALTER TABLE \`bill_item\`
                ADD COLUMN \`created_by\` int unsigned NULL
            `);
        }

        if (checkUpdatedBy[0].count === 0) {
            await queryRunner.query(`
                ALTER TABLE \`bill_item\`
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
            AND TABLE_NAME = 'bill_item'
            AND COLUMN_NAME = 'created_by'
        `);

        const checkUpdatedBy = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'bill_item'
            AND COLUMN_NAME = 'updated_by'
        `);

        if (checkCreatedBy[0].count > 0) {
            await queryRunner.query(`
                ALTER TABLE \`bill_item\`
                DROP COLUMN \`created_by\`
            `);
        }

        if (checkUpdatedBy[0].count > 0) {
            await queryRunner.query(`
                ALTER TABLE \`bill_item\`
                DROP COLUMN \`updated_by\`
            `);
        }
    }
}

module.exports = AddAuditColumnsToBillItem1700000000020;


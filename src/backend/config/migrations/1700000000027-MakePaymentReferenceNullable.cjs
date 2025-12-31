const { MigrationInterface, QueryRunner } = require("typeorm");

/**
 * Migration: Make payment.reference field nullable
 * 
 * This allows cash payments to have null reference values,
 * as they don't require M-Pesa reference codes.
 */
class MakePaymentReferenceNullable1700000000027 {
    constructor() {
        this.name = 'MakePaymentReferenceNullable1700000000027';
    }

    async up(queryRunner) {
        // Alter the payment table to make reference nullable
        await queryRunner.query(`
            ALTER TABLE \`payment\` 
            MODIFY COLUMN \`reference\` varchar(255) NULL
        `);
    }

    async down(queryRunner) {
        // Revert: make reference NOT NULL again
        // First, set any NULL values to empty string
        await queryRunner.query(`
            UPDATE \`payment\` 
            SET \`reference\` = '' 
            WHERE \`reference\` IS NULL
        `);
        
        // Then make it NOT NULL
        await queryRunner.query(`
            ALTER TABLE \`payment\` 
            MODIFY COLUMN \`reference\` varchar(255) NOT NULL
        `);
    }
}

module.exports = MakePaymentReferenceNullable1700000000027;


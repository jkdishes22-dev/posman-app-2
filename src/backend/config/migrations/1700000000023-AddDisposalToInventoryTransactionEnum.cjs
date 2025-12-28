/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Adds 'disposal' value to inventory_transaction.transaction_type enum
 */
class AddDisposalToInventoryTransactionEnum1700000000023 {
    constructor() {
        this.name = "AddDisposalToInventoryTransactionEnum1700000000023";
    }

    async up(queryRunner) {
        console.log("🔄 Adding 'disposal' to inventory_transaction.transaction_type enum...");

        // Check current enum values for transaction_type
        const transactionTypeCheck = await queryRunner.query(`
            SELECT COLUMN_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'inventory_transaction' 
            AND COLUMN_NAME = 'transaction_type'
        `);

        if (transactionTypeCheck.length > 0) {
            const currentEnum = transactionTypeCheck[0].COLUMN_TYPE;
            
            // Check if 'disposal' is already in the enum
            if (!currentEnum.includes("'disposal'")) {
                console.log("   ➕ Adding 'disposal' to transaction_type enum...");
                
                // Alter the enum to include 'disposal'
                // MySQL requires recreating the enum with all values
                // Current values should be: sale, purchase, adjustment, transfer, return, production
                await queryRunner.query(`
                    ALTER TABLE \`inventory_transaction\` 
                    MODIFY COLUMN \`transaction_type\` 
                    ENUM('sale','purchase','adjustment','transfer','return','production','disposal') NOT NULL
                `);
                
                console.log("   ✅ Added 'disposal' to transaction_type enum");
            } else {
                console.log("   ⏭️  'disposal' already exists in transaction_type enum");
            }
        } else {
            console.log("   ⚠️  Warning: inventory_transaction.transaction_type column not found");
        }

        console.log("✅ Enum update completed!");
    }

    async down(queryRunner) {
        console.log("🔄 Removing 'disposal' from inventory_transaction.transaction_type enum...");

        // Check current enum values
        const transactionTypeCheck = await queryRunner.query(`
            SELECT COLUMN_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'inventory_transaction' 
            AND COLUMN_NAME = 'transaction_type'
        `);

        if (transactionTypeCheck.length > 0) {
            const currentEnum = transactionTypeCheck[0].COLUMN_TYPE;
            
            // Check if 'disposal' is in the enum
            if (currentEnum.includes("'disposal'")) {
                console.log("   ➖ Removing 'disposal' from transaction_type enum...");
                
                // Remove 'disposal' from the enum
                await queryRunner.query(`
                    ALTER TABLE \`inventory_transaction\` 
                    MODIFY COLUMN \`transaction_type\` 
                    ENUM('sale','purchase','adjustment','transfer','return','production') NOT NULL
                `);
                
                console.log("   ✅ Removed 'disposal' from transaction_type enum");
            } else {
                console.log("   ⏭️  'disposal' not found in transaction_type enum");
            }
        }

        console.log("✅ Enum rollback completed!");
    }
}

module.exports = AddDisposalToInventoryTransactionEnum1700000000023;


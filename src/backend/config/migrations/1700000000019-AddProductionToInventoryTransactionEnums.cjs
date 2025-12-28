/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Adds 'production' to transaction_type enum and 'production_issue' to reference_type enum
 * in the inventory_transaction table to support production tracking
 */
class AddProductionToInventoryTransactionEnums1700000000019 {
    constructor() {
        this.name = "AddProductionToInventoryTransactionEnums1700000000019";
    }

    async up(queryRunner) {
        console.log("🔄 Adding production values to inventory_transaction enums...");

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
            
            // Check if 'production' is already in the enum
            if (!currentEnum.includes("'production'")) {
                console.log("   ➕ Adding 'production' to transaction_type enum...");
                
                // Alter the enum to include 'production'
                // MySQL requires recreating the enum with all values
                await queryRunner.query(`
                    ALTER TABLE \`inventory_transaction\` 
                    MODIFY COLUMN \`transaction_type\` 
                    ENUM('sale','purchase','adjustment','transfer','return','production') NOT NULL
                `);
                
                console.log("   ✅ Added 'production' to transaction_type enum");
            } else {
                console.log("   ⏭️  'production' already exists in transaction_type enum");
            }
        }

        // Check current enum values for reference_type
        const referenceTypeCheck = await queryRunner.query(`
            SELECT COLUMN_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'inventory_transaction' 
            AND COLUMN_NAME = 'reference_type'
        `);

        if (referenceTypeCheck.length > 0) {
            const currentEnum = referenceTypeCheck[0].COLUMN_TYPE;
            
            // Check if 'production_issue' is already in the enum
            if (!currentEnum.includes("'production_issue'")) {
                console.log("   ➕ Adding 'production_issue' to reference_type enum...");
                
                // Alter the enum to include 'production_issue'
                await queryRunner.query(`
                    ALTER TABLE \`inventory_transaction\` 
                    MODIFY COLUMN \`reference_type\` 
                    ENUM('bill','purchase_order','manual_adjustment','production_issue') DEFAULT NULL
                `);
                
                console.log("   ✅ Added 'production_issue' to reference_type enum");
            } else {
                console.log("   ⏭️  'production_issue' already exists in reference_type enum");
            }
        }

        console.log("✅ Inventory transaction enum update completed!");
    }

    async down(queryRunner) {
        console.log("🔄 Removing production values from inventory_transaction enums...");

        // Remove 'production' from transaction_type enum
        await queryRunner.query(`
            ALTER TABLE \`inventory_transaction\` 
            MODIFY COLUMN \`transaction_type\` 
            ENUM('sale','purchase','adjustment','transfer','return') NOT NULL
        `);

        // Remove 'production_issue' from reference_type enum
        await queryRunner.query(`
            ALTER TABLE \`inventory_transaction\` 
            MODIFY COLUMN \`reference_type\` 
            ENUM('bill','purchase_order','manual_adjustment') DEFAULT NULL
        `);

        console.log("✅ Removed production values from inventory_transaction enums");
    }
}

module.exports = AddProductionToInventoryTransactionEnums1700000000019;


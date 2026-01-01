const { MigrationInterface, QueryRunner } = require("typeorm");

/**
 * Migration: Create pricelist_item_audit and item_audit tables
 * 
 * This migration creates audit tables to track all changes to pricelist items and items.
 * These tables store field-level changes with old/new values, user who made the change, and timestamp.
 */
module.exports = class CreatePricelistAuditTables1700000000031 {
    name = 'CreatePricelistAuditTables1700000000031'

    async up(queryRunner) {
        // Check if pricelist_item_audit table already exists
        const checkPricelistItemAuditTable = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'pricelist_item_audit'
        `);

        if (checkPricelistItemAuditTable[0].count === 0) {
            await queryRunner.query(`
                CREATE TABLE IF NOT EXISTS \`pricelist_item_audit\` (
                    \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                    \`pricelist_item_id\` int unsigned NOT NULL,
                    \`field_name\` varchar(255) NOT NULL,
                    \`old_value\` text NULL,
                    \`new_value\` text NULL,
                    \`changed_by\` int unsigned NULL,
                    \`changed_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    \`change_reason\` text NULL,
                    PRIMARY KEY (\`id\`),
                    KEY \`FK_pricelist_item_audit_pricelist_item\` (\`pricelist_item_id\`),
                    KEY \`FK_pricelist_item_audit_user\` (\`changed_by\`),
                    KEY \`IDX_pricelist_item_audit_changed_at\` (\`changed_at\`),
                    CONSTRAINT \`FK_pricelist_item_audit_pricelist_item\` FOREIGN KEY (\`pricelist_item_id\`) REFERENCES \`pricelist_item\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                    CONSTRAINT \`FK_pricelist_item_audit_user\` FOREIGN KEY (\`changed_by\`) REFERENCES \`user\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log("Created pricelist_item_audit table");
        } else {
            console.log("Table pricelist_item_audit already exists");
        }

        // Check if item_audit table already exists
        const checkItemAuditTable = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'item_audit'
        `);

        if (checkItemAuditTable[0].count === 0) {
            await queryRunner.query(`
                CREATE TABLE IF NOT EXISTS \`item_audit\` (
                    \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                    \`item_id\` int unsigned NOT NULL,
                    \`field_name\` varchar(255) NOT NULL,
                    \`old_value\` text NULL,
                    \`new_value\` text NULL,
                    \`changed_by\` int unsigned NULL,
                    \`changed_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    \`change_reason\` text NULL,
                    PRIMARY KEY (\`id\`),
                    KEY \`FK_item_audit_item\` (\`item_id\`),
                    KEY \`FK_item_audit_user\` (\`changed_by\`),
                    KEY \`IDX_item_audit_changed_at\` (\`changed_at\`),
                    CONSTRAINT \`FK_item_audit_item\` FOREIGN KEY (\`item_id\`) REFERENCES \`item\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                    CONSTRAINT \`FK_item_audit_user\` FOREIGN KEY (\`changed_by\`) REFERENCES \`user\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log("Created item_audit table");
        } else {
            console.log("Table item_audit already exists");
        }
    }

    async down(queryRunner) {
        // Drop item_audit table first (no dependencies)
        const checkItemAuditTable = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'item_audit'
        `);

        if (checkItemAuditTable[0].count > 0) {
            await queryRunner.query(`
                DROP TABLE IF EXISTS \`item_audit\`
            `);
            console.log("Dropped item_audit table");
        } else {
            console.log("Table item_audit does not exist");
        }

        // Drop pricelist_item_audit table
        const checkPricelistItemAuditTable = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'pricelist_item_audit'
        `);

        if (checkPricelistItemAuditTable[0].count > 0) {
            await queryRunner.query(`
                DROP TABLE IF EXISTS \`pricelist_item_audit\`
            `);
            console.log("Dropped pricelist_item_audit table");
        } else {
            console.log("Table pricelist_item_audit does not exist");
        }
    }
}


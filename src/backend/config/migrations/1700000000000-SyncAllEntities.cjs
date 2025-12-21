/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 */
class SyncAllEntities1700000000000 {
    constructor() {
        this.name = 'SyncAllEntities1700000000000';
    }

    async up(queryRunner) {
        // Create permission_scope table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`permission_scope\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`name\` varchar(255) NOT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create permissions table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`permissions\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`name\` varchar(255) NOT NULL,
                \`scope_id\` int unsigned DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`FK_permissions_scope\` (\`scope_id\`),
                CONSTRAINT \`FK_permissions_scope\` FOREIGN KEY (\`scope_id\`) REFERENCES \`permission_scope\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create roles table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`roles\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`name\` varchar(255) NOT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create role_permissions junction table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`role_permissions\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`role_id\` int unsigned DEFAULT NULL,
                \`permission_id\` int unsigned DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`FK_role_permissions_role\` (\`role_id\`),
                KEY \`FK_role_permissions_permission\` (\`permission_id\`),
                CONSTRAINT \`FK_role_permissions_role\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`FK_role_permissions_permission\` FOREIGN KEY (\`permission_id\`) REFERENCES \`permissions\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create user table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`user\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`username\` varchar(255) NOT NULL,
                \`lastName\` varchar(255) NOT NULL,
                \`firstName\` varchar(255) NOT NULL,
                \`password\` varchar(255) NOT NULL,
                \`status\` varchar(255) NOT NULL DEFAULT 'ACTIVE',
                \`refreshToken\` varchar(255) DEFAULT NULL,
                \`is_locked\` tinyint(1) NOT NULL DEFAULT '0',
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create user_roles junction table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`user_roles\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`user_id\` int unsigned DEFAULT NULL,
                \`role_id\` int unsigned DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`FK_user_roles_user\` (\`user_id\`),
                KEY \`FK_user_roles_role\` (\`role_id\`),
                CONSTRAINT \`FK_user_roles_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`FK_user_roles_role\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create category table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`category\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`name\` varchar(255) NOT NULL,
                \`status\` enum('active','disabled','deleted') NOT NULL DEFAULT 'active',
                PRIMARY KEY (\`id\`),
                KEY \`IDX_category_status\` (\`status\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create item table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`item\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`name\` varchar(255) NOT NULL,
                \`code\` varchar(255) NOT NULL,
                \`status\` enum('ACTIVE','DELETED') NOT NULL,
                \`item_category_id\` int unsigned DEFAULT NULL,
                \`default_unit_id\` int unsigned DEFAULT NULL,
                \`is_group\` tinyint(1) DEFAULT NULL,
                \`is_stock\` tinyint(1) DEFAULT '0',
                PRIMARY KEY (\`id\`),
                KEY \`FK_item_category\` (\`item_category_id\`),
                CONSTRAINT \`FK_item_category\` FOREIGN KEY (\`item_category_id\`) REFERENCES \`category\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create item_group junction table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`item_group\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`item_id\` int unsigned DEFAULT NULL,
                \`sub_item_id\` int unsigned DEFAULT NULL,
                \`portion_size\` decimal(10,2) NOT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`FK_item_group_item\` (\`item_id\`),
                KEY \`FK_item_group_sub_item\` (\`sub_item_id\`),
                CONSTRAINT \`FK_item_group_item\` FOREIGN KEY (\`item_id\`) REFERENCES \`item\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`FK_item_group_sub_item\` FOREIGN KEY (\`sub_item_id\`) REFERENCES \`item\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create station table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`station\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`name\` varchar(255) NOT NULL,
                \`status\` enum('active','inactive') NOT NULL DEFAULT 'inactive',
                \`description\` text,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create pricelist table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`pricelist\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`name\` varchar(255) NOT NULL,
                \`status\` enum('active','inactive','under_review') DEFAULT 'inactive',
                \`is_default\` tinyint(1) NOT NULL DEFAULT '0',
                \`description\` text,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create station_pricelist junction table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`station_pricelist\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`station_id\` int unsigned DEFAULT NULL,
                \`pricelist_id\` int unsigned DEFAULT NULL,
                \`is_default\` tinyint(1) NOT NULL DEFAULT '0',
                \`status\` enum('active','inactive','under_review') NOT NULL DEFAULT 'active',
                \`notes\` text,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`IDX_station_pricelist_unique\` (\`station_id\`,\`pricelist_id\`),
                KEY \`IDX_station_pricelist_station_default\` (\`station_id\`,\`is_default\`),
                KEY \`IDX_station_pricelist_pricelist_status\` (\`pricelist_id\`,\`status\`),
                KEY \`FK_station_pricelist_station\` (\`station_id\`),
                KEY \`FK_station_pricelist_pricelist\` (\`pricelist_id\`),
                CONSTRAINT \`FK_station_pricelist_station\` FOREIGN KEY (\`station_id\`) REFERENCES \`station\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`FK_station_pricelist_pricelist\` FOREIGN KEY (\`pricelist_id\`) REFERENCES \`pricelist\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create pricelist_item table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`pricelist_item\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`pricelist_id\` int unsigned DEFAULT NULL,
                \`item_id\` int unsigned DEFAULT NULL,
                \`price\` double NOT NULL DEFAULT '0',
                \`currency\` enum('USD','KES') DEFAULT NULL,
                \`is_enabled\` tinyint(1) NOT NULL DEFAULT '1',
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`FK_pricelist_item_pricelist\` (\`pricelist_id\`),
                KEY \`FK_pricelist_item_item\` (\`item_id\`),
                CONSTRAINT \`FK_pricelist_item_pricelist\` FOREIGN KEY (\`pricelist_id\`) REFERENCES \`pricelist\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`FK_pricelist_item_item\` FOREIGN KEY (\`item_id\`) REFERENCES \`item\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create user_station table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`user_station\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`user_id\` int unsigned DEFAULT NULL,
                \`station_id\` int unsigned DEFAULT NULL,
                \`is_default\` tinyint(1) DEFAULT NULL,
                \`status\` enum('active','inactive') DEFAULT 'active',
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_user_station_user_status\` (\`user_id\`,\`status\`),
                KEY \`IDX_user_station_user_default_status\` (\`user_id\`,\`is_default\`,\`status\`),
                KEY \`FK_user_station_user\` (\`user_id\`),
                KEY \`FK_user_station_station\` (\`station_id\`),
                CONSTRAINT \`FK_user_station_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`FK_user_station_station\` FOREIGN KEY (\`station_id\`) REFERENCES \`station\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create bill table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`bill\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`user_id\` int unsigned DEFAULT NULL,
                \`status\` enum('pending','submitted','closed','reopened','cancelled','voided') DEFAULT NULL,
                \`total\` decimal(10,2) DEFAULT NULL,
                \`cleared_by\` int unsigned DEFAULT NULL,
                \`cleared_at\` datetime DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`request_id\` varchar(255) DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                \`station_id\` int unsigned DEFAULT NULL,
                \`reopen_reason\` text,
                \`reopened_by\` int unsigned DEFAULT NULL,
                \`reopened_at\` datetime DEFAULT NULL,
                \`notes\` text,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_bill_request_id\` (\`request_id\`),
                KEY \`IDX_bill_user_created\` (\`user_id\`,\`created_at\`),
                KEY \`IDX_bill_status_created\` (\`status\`,\`created_at\`),
                KEY \`IDX_bill_station_created\` (\`station_id\`,\`created_at\`),
                KEY \`idx_bill_station\` (\`station_id\`),
                KEY \`FK_bill_user\` (\`user_id\`),
                CONSTRAINT \`FK_bill_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT \`fk_bill_station\` FOREIGN KEY (\`station_id\`) REFERENCES \`station\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create bill_item table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`bill_item\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`item_id\` int unsigned DEFAULT NULL,
                \`bill_id\` int unsigned DEFAULT NULL,
                \`quantity\` int NOT NULL DEFAULT '0',
                \`subtotal\` double NOT NULL DEFAULT '0',
                \`status\` enum('pending','submitted','void_pending','voided','closed','quantity_change_request','deleted') NOT NULL DEFAULT 'pending',
                \`void_reason\` text,
                \`void_requested_by\` int unsigned DEFAULT NULL,
                \`void_requested_at\` datetime DEFAULT NULL,
                \`void_approved_by\` int unsigned DEFAULT NULL,
                \`void_approved_at\` datetime DEFAULT NULL,
                \`requested_quantity\` int DEFAULT NULL,
                \`quantity_change_reason\` text,
                \`quantity_change_requested_by\` int unsigned DEFAULT NULL,
                \`quantity_change_requested_at\` datetime DEFAULT NULL,
                \`quantity_change_approved_by\` int unsigned DEFAULT NULL,
                \`quantity_change_approved_at\` datetime DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_bill_item_bill_created\` (\`bill_id\`,\`created_at\`),
                KEY \`IDX_bill_item_item_status\` (\`item_id\`,\`status\`),
                KEY \`FK_bill_item_item\` (\`item_id\`),
                KEY \`FK_bill_item_bill\` (\`bill_id\`),
                CONSTRAINT \`FK_bill_item_item\` FOREIGN KEY (\`item_id\`) REFERENCES \`item\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT \`FK_bill_item_bill\` FOREIGN KEY (\`bill_id\`) REFERENCES \`bill\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create payment table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`payment\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`debit_amount\` double NOT NULL DEFAULT '0',
                \`credit_amount\` double NOT NULL DEFAULT '0',
                \`payment_type\` enum('CASH','MPESA') NOT NULL,
                \`paid_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`reference\` varchar(255) NOT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`created_by\` int unsigned NOT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create bill_payment junction table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`bill_payment\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`bill_id\` int unsigned DEFAULT NULL,
                \`payment_id\` int unsigned DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`created_by\` int unsigned NOT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`FK_bill_payment_bill\` (\`bill_id\`),
                KEY \`FK_bill_payment_payment\` (\`payment_id\`),
                CONSTRAINT \`FK_bill_payment_bill\` FOREIGN KEY (\`bill_id\`) REFERENCES \`bill\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`FK_bill_payment_payment\` FOREIGN KEY (\`payment_id\`) REFERENCES \`payment\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create notifications table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`notifications\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`type\` varchar(100) NOT NULL,
                \`title\` varchar(255) NOT NULL,
                \`message\` text NOT NULL,
                \`data\` json DEFAULT NULL,
                \`status\` enum('unread','read','archived') NOT NULL DEFAULT 'unread',
                \`user_id\` int unsigned NOT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`),
                KEY \`FK_notifications_user\` (\`user_id\`),
                KEY \`FK_notifications_created_by\` (\`created_by\`),
                CONSTRAINT \`FK_notifications_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`FK_notifications_created_by\` FOREIGN KEY (\`created_by\`) REFERENCES \`user\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create credit_note table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`credit_note\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`bill_id\` int unsigned DEFAULT NULL,
                \`credit_amount\` decimal(10,2) DEFAULT NULL,
                \`reason\` text,
                \`notes\` text,
                \`status\` enum('pending','processed','cancelled') NOT NULL DEFAULT 'pending',
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`processed_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`processed_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`FK_credit_note_bill\` (\`bill_id\`),
                KEY \`FK_credit_note_created_by\` (\`created_by\`),
                KEY \`FK_credit_note_processed_by\` (\`processed_by\`),
                CONSTRAINT \`FK_credit_note_bill\` FOREIGN KEY (\`bill_id\`) REFERENCES \`bill\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT \`FK_credit_note_created_by\` FOREIGN KEY (\`created_by\`) REFERENCES \`user\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT \`FK_credit_note_processed_by\` FOREIGN KEY (\`processed_by\`) REFERENCES \`user\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create reopen_reasons table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`reopen_reasons\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`reason_key\` varchar(100) NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`description\` text,
                \`is_active\` tinyint(1) NOT NULL DEFAULT '1',
                \`sort_order\` int NOT NULL DEFAULT '0',
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_reopen_reasons_key\` (\`reason_key\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create bill_void_request table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`bill_void_request\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`bill_id\` int unsigned NOT NULL,
                \`initiated_by\` int unsigned NOT NULL,
                \`approved_by\` int unsigned DEFAULT NULL,
                \`status\` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
                \`reason\` text,
                \`approval_notes\` text,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`approved_at\` datetime DEFAULT NULL,
                \`updated_at\` datetime DEFAULT NULL,
                \`paper_approval_received\` tinyint(1) NOT NULL DEFAULT '0',
                \`paper_approval_date\` datetime DEFAULT NULL,
                \`paper_approval_notes\` text,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_bill_void_request_bill_status\` (\`bill_id\`,\`status\`),
                KEY \`IDX_bill_void_request_initiated_created\` (\`initiated_by\`,\`created_at\`),
                KEY \`IDX_bill_void_request_approved_approved\` (\`approved_by\`,\`approved_at\`),
                KEY \`FK_bill_void_request_bill\` (\`bill_id\`),
                KEY \`FK_bill_void_request_initiated_by\` (\`initiated_by\`),
                KEY \`FK_bill_void_request_approved_by\` (\`approved_by\`),
                CONSTRAINT \`FK_bill_void_request_bill\` FOREIGN KEY (\`bill_id\`) REFERENCES \`bill\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`FK_bill_void_request_initiated_by\` FOREIGN KEY (\`initiated_by\`) REFERENCES \`user\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT \`FK_bill_void_request_approved_by\` FOREIGN KEY (\`approved_by\`) REFERENCES \`user\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create inventory_item table (if needed)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`inventory_item\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`item_id\` int unsigned DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`FK_inventory_item_item\` (\`item_id\`),
                CONSTRAINT \`FK_inventory_item_item\` FOREIGN KEY (\`item_id\`) REFERENCES \`item\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }

    async down(queryRunner) {
        // Drop tables in reverse order (respecting foreign key dependencies)
        await queryRunner.query(`DROP TABLE IF EXISTS \`inventory_item\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`bill_void_request\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`reopen_reasons\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`credit_note\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`notifications\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`bill_payment\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`payment\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`bill_item\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`bill\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`user_station\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`pricelist_item\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`station_pricelist\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`pricelist\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`station\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`item_group\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`item\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`category\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`user_roles\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`user\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`role_permissions\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`roles\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`permissions\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`permission_scope\``);
    }
}

module.exports = SyncAllEntities1700000000000;
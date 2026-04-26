/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Consolidated schema: all tables/columns/enums/indexes in final form.
 * Uses CREATE IF NOT EXISTS plus guarded ALTER/INDEX for existing DBs.
 */
module.exports = class SyncAllEntitiesConsolidated1700000000000 {
  name = "SyncAllEntitiesConsolidated1700000000000";

  async up(queryRunner) {
    await this.createCoreTables(queryRunner);
    await this.createExtendedTables(queryRunner);
    await this.applyIncrementalUpgrades(queryRunner);
    await this.ensurePerformanceIndexes(queryRunner);
  }

  async createCoreTables(queryRunner) {
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

    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`category\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`name\` varchar(255) NOT NULL,
                \`status\` enum('active','disabled','deleted') NOT NULL DEFAULT 'active',
                \`code\` varchar(255) DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_category_status\` (\`status\`),
                KEY \`IDX_category_created_at\` (\`created_at\`),
                UNIQUE KEY \`IDX_category_code\` (\`code\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

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
                \`allow_negative_inventory\` tinyint(1) DEFAULT '0',
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_item_created_at\` (\`created_at\`),
                KEY \`FK_item_category\` (\`item_category_id\`),
                CONSTRAINT \`FK_item_category\` FOREIGN KEY (\`item_category_id\`) REFERENCES \`category\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

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

    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`pricelist\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`name\` varchar(255) NOT NULL,
                \`code\` varchar(255) DEFAULT NULL,
                \`status\` enum('active','inactive','under_review') DEFAULT 'inactive',
                \`is_default\` tinyint(1) NOT NULL DEFAULT '0',
                \`description\` text,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`IDX_pricelist_code\` (\`code\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

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
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_bill_item_bill_created\` (\`bill_id\`,\`created_at\`),
                KEY \`IDX_bill_item_item_status\` (\`item_id\`,\`status\`),
                KEY \`FK_bill_item_item\` (\`item_id\`),
                KEY \`FK_bill_item_bill\` (\`bill_id\`),
                CONSTRAINT \`FK_bill_item_item\` FOREIGN KEY (\`item_id\`) REFERENCES \`item\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT \`FK_bill_item_bill\` FOREIGN KEY (\`bill_id\`) REFERENCES \`bill\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`payment\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`debit_amount\` double NOT NULL DEFAULT '0',
                \`credit_amount\` double NOT NULL DEFAULT '0',
                \`payment_type\` enum('CASH','MPESA') NOT NULL,
                \`paid_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`reference\` varchar(255) DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`created_by\` int unsigned NOT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

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
                \`updated_by\` int unsigned DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`),
                KEY \`FK_notifications_user\` (\`user_id\`),
                KEY \`FK_notifications_created_by\` (\`created_by\`),
                CONSTRAINT \`FK_notifications_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`FK_notifications_created_by\` FOREIGN KEY (\`created_by\`) REFERENCES \`user\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

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
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_reopen_reasons_key\` (\`reason_key\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

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

  async createExtendedTables(queryRunner) {
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`supplier\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`name\` varchar(255) NOT NULL,
                \`contact_person\` varchar(255) DEFAULT NULL,
                \`email\` varchar(255) DEFAULT NULL,
                \`phone\` varchar(50) DEFAULT NULL,
                \`address\` text DEFAULT NULL,
                \`credit_limit\` decimal(10,2) NOT NULL DEFAULT 0.00,
                \`payment_terms\` varchar(255) DEFAULT NULL,
                \`status\` enum('active','inactive') NOT NULL DEFAULT 'active',
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_supplier_status\` (\`status\`),
                KEY \`IDX_supplier_name\` (\`name\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`inventory\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`item_id\` int unsigned NOT NULL,
                \`quantity\` int NOT NULL DEFAULT 0,
                \`reserved_quantity\` int NOT NULL DEFAULT 0,
                \`min_stock_level\` int DEFAULT NULL,
                \`max_stock_level\` int DEFAULT NULL,
                \`reorder_point\` int DEFAULT NULL,
                \`last_restocked_at\` datetime DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_inventory_item_id\` (\`item_id\`),
                KEY \`IDX_inventory_item_id\` (\`item_id\`),
                KEY \`IDX_inventory_quantity\` (\`quantity\`),
                CONSTRAINT \`FK_inventory_item\` FOREIGN KEY (\`item_id\`)
                    REFERENCES \`item\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`purchase_order\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`supplier_id\` int unsigned NOT NULL,
                \`order_number\` varchar(100) NOT NULL,
                \`order_date\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`expected_delivery_date\` datetime DEFAULT NULL,
                \`status\` enum('draft','sent','partial','received','cancelled') NOT NULL DEFAULT 'draft',
                \`total_amount\` decimal(10,2) NOT NULL DEFAULT 0.00,
                \`notes\` text DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_purchase_order_order_number\` (\`order_number\`),
                KEY \`IDX_purchase_order_status\` (\`status\`),
                KEY \`IDX_purchase_order_supplier_id\` (\`supplier_id\`),
                CONSTRAINT \`FK_purchase_order_supplier\` FOREIGN KEY (\`supplier_id\`)
                    REFERENCES \`supplier\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`purchase_order_item\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`purchase_order_id\` int unsigned NOT NULL,
                \`item_id\` int unsigned NOT NULL,
                \`quantity_ordered\` int NOT NULL,
                \`quantity_received\` int NOT NULL DEFAULT 0,
                \`unit_price\` decimal(10,2) NOT NULL,
                \`subtotal\` decimal(10,2) NOT NULL DEFAULT 0.00,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_purchase_order_item_po_id\` (\`purchase_order_id\`),
                KEY \`IDX_purchase_order_item_item_id\` (\`item_id\`),
                CONSTRAINT \`FK_purchase_order_item_po\` FOREIGN KEY (\`purchase_order_id\`)
                    REFERENCES \`purchase_order\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`FK_purchase_order_item_item\` FOREIGN KEY (\`item_id\`)
                    REFERENCES \`item\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`inventory_transaction\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`item_id\` int unsigned NOT NULL,
                \`transaction_type\` enum('sale','purchase','adjustment','transfer','return','production','disposal') NOT NULL,
                \`quantity\` int NOT NULL,
                \`reference_type\` enum('bill','purchase_order','manual_adjustment','production_issue') DEFAULT NULL,
                \`reference_id\` int unsigned DEFAULT NULL,
                \`notes\` text DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_inventory_transaction_item_id\` (\`item_id\`),
                KEY \`IDX_inventory_transaction_type\` (\`transaction_type\`),
                KEY \`IDX_inventory_transaction_reference_type\` (\`reference_type\`),
                KEY \`IDX_inventory_transaction_created_at\` (\`created_at\`),
                CONSTRAINT \`FK_inventory_transaction_item\` FOREIGN KEY (\`item_id\`)
                    REFERENCES \`item\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`supplier_payment\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`supplier_id\` int unsigned NOT NULL,
                \`payment_id\` int unsigned NOT NULL,
                \`amount_paid\` decimal(10,2) NOT NULL DEFAULT 0.00,
                \`amount_received\` decimal(10,2) NOT NULL DEFAULT 0.00,
                \`reference\` varchar(255) DEFAULT NULL,
                \`notes\` text DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_supplier_payment_supplier_id\` (\`supplier_id\`),
                KEY \`IDX_supplier_payment_payment_id\` (\`payment_id\`),
                KEY \`IDX_supplier_payment_created_at\` (\`created_at\`),
                CONSTRAINT \`FK_supplier_payment_supplier\` FOREIGN KEY (\`supplier_id\`)
                    REFERENCES \`supplier\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT \`FK_supplier_payment_payment\` FOREIGN KEY (\`payment_id\`)
                    REFERENCES \`payment\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`supplier_transaction\` (
                \`id\` int unsigned NOT NULL AUTO_INCREMENT,
                \`supplier_id\` int unsigned NOT NULL,
                \`transaction_type\` enum('purchase_order','payment','return','refund','adjustment','credit_note') NOT NULL,
                \`debit_amount\` decimal(10,2) NOT NULL DEFAULT 0.00,
                \`credit_amount\` decimal(10,2) NOT NULL DEFAULT 0.00,
                \`reference_type\` enum('purchase_order','payment','return','refund','adjustment','credit_note') DEFAULT NULL,
                \`reference_id\` int unsigned DEFAULT NULL,
                \`notes\` text DEFAULT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime DEFAULT NULL,
                \`created_by\` int unsigned DEFAULT NULL,
                \`updated_by\` int unsigned DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_supplier_transaction_supplier_id\` (\`supplier_id\`),
                KEY \`IDX_supplier_transaction_type\` (\`transaction_type\`),
                KEY \`IDX_supplier_transaction_reference_type\` (\`reference_type\`),
                KEY \`IDX_supplier_transaction_created_at\` (\`created_at\`),
                CONSTRAINT \`FK_supplier_transaction_supplier\` FOREIGN KEY (\`supplier_id\`)
                    REFERENCES \`supplier\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

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
  }

  async columnExists(queryRunner, tableName, columnName) {
    const r = await queryRunner.query(
      `SELECT COUNT(*) as c FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [tableName, columnName],
    );
    return Number(r[0]?.c ?? 0) > 0;
  }

  async indexExists(queryRunner, tableName, indexName) {
    const r = await queryRunner.query(
      `SELECT COUNT(*) as c FROM INFORMATION_SCHEMA.STATISTICS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [tableName, indexName],
    );
    return Number(r[0]?.c ?? 0) > 0;
  }

  async applyIncrementalUpgrades(queryRunner) {
    const cx = (t, c) => this.columnExists(queryRunner, t, c);
    const ix = (t, i) => this.indexExists(queryRunner, t, i);

    if (!(await cx("category", "code"))) {
      await queryRunner.query(`ALTER TABLE \`category\` ADD COLUMN \`code\` varchar(255) NULL`);
    }
    if (!(await cx("category", "created_at"))) {
      await queryRunner.query(
        `ALTER TABLE \`category\` ADD COLUMN \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      );
    }
    if (!(await cx("category", "updated_at"))) {
      await queryRunner.query(`ALTER TABLE \`category\` ADD COLUMN \`updated_at\` datetime DEFAULT NULL`);
    }
    if (!(await cx("category", "created_by"))) {
      await queryRunner.query(`ALTER TABLE \`category\` ADD COLUMN \`created_by\` int unsigned DEFAULT NULL`);
    }
    if (!(await cx("category", "updated_by"))) {
      await queryRunner.query(`ALTER TABLE \`category\` ADD COLUMN \`updated_by\` int unsigned DEFAULT NULL`);
    }
    if (!(await ix("category", "IDX_category_created_at"))) {
      await queryRunner.query(`CREATE INDEX \`IDX_category_created_at\` ON \`category\` (\`created_at\`)`);
    }
    if (!(await ix("category", "IDX_category_code"))) {
      await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_category_code\` ON \`category\` (\`code\`)`);
    }

    for (const [col, sql] of [
      ["allow_negative_inventory", "`allow_negative_inventory` tinyint(1) DEFAULT '0'"],
      ["created_at", "`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP"],
      ["updated_at", "`updated_at` datetime DEFAULT NULL"],
      ["created_by", "`created_by` int unsigned DEFAULT NULL"],
      ["updated_by", "`updated_by` int unsigned DEFAULT NULL"],
    ]) {
      if (!(await cx("item", col))) {
        await queryRunner.query(`ALTER TABLE \`item\` ADD COLUMN ${sql}`);
      }
    }
    if (!(await ix("item", "IDX_item_created_at"))) {
      await queryRunner.query(`CREATE INDEX \`IDX_item_created_at\` ON \`item\` (\`created_at\`)`);
    }

    if (!(await cx("pricelist", "code"))) {
      await queryRunner.query(`ALTER TABLE \`pricelist\` ADD COLUMN \`code\` varchar(255) DEFAULT NULL`);
    }
    if (!(await ix("pricelist", "IDX_pricelist_code"))) {
      await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_pricelist_code\` ON \`pricelist\` (\`code\`)`);
    }

    if (!(await cx("bill_item", "created_by"))) {
      await queryRunner.query(`ALTER TABLE \`bill_item\` ADD COLUMN \`created_by\` int unsigned DEFAULT NULL`);
    }
    if (!(await cx("bill_item", "updated_by"))) {
      await queryRunner.query(`ALTER TABLE \`bill_item\` ADD COLUMN \`updated_by\` int unsigned DEFAULT NULL`);
    }

    if (!(await cx("reopen_reasons", "created_by"))) {
      await queryRunner.query(`ALTER TABLE \`reopen_reasons\` ADD COLUMN \`created_by\` int unsigned DEFAULT NULL`);
    }
    if (!(await cx("reopen_reasons", "updated_by"))) {
      await queryRunner.query(`ALTER TABLE \`reopen_reasons\` ADD COLUMN \`updated_by\` int unsigned DEFAULT NULL`);
    }
    if (!(await cx("notifications", "updated_by"))) {
      await queryRunner.query(`ALTER TABLE \`notifications\` ADD COLUMN \`updated_by\` int unsigned DEFAULT NULL`);
    }

    await queryRunner.query(
      `ALTER TABLE \`payment\` MODIFY COLUMN \`reference\` varchar(255) DEFAULT NULL`,
    ).catch(() => {});

    const tt = await queryRunner.query(`
            SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory_transaction' AND COLUMN_NAME = 'transaction_type'
        `);
    if (tt.length > 0) {
      const e = String(tt[0].COLUMN_TYPE || "");
      if (!e.includes("'production'") || !e.includes("'disposal'")) {
        await queryRunner.query(`
                    ALTER TABLE \`inventory_transaction\`
                    MODIFY COLUMN \`transaction_type\`
                    ENUM('sale','purchase','adjustment','transfer','return','production','disposal') NOT NULL
                `);
      }
    }
    const rt = await queryRunner.query(`
            SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory_transaction' AND COLUMN_NAME = 'reference_type'
        `);
    if (rt.length > 0) {
      const e = String(rt[0].COLUMN_TYPE || "");
      if (!e.includes("'production_issue'")) {
        await queryRunner.query(`
                    ALTER TABLE \`inventory_transaction\`
                    MODIFY COLUMN \`reference_type\`
                    ENUM('bill','purchase_order','manual_adjustment','production_issue') DEFAULT NULL
                `);
      }
    }
  }

  async ensurePerformanceIndexes(queryRunner) {
    const ix = (t, i) => this.indexExists(queryRunner, t, i);

    if (!(await ix("item", "IDX_item_name"))) {
      await queryRunner.query(`CREATE INDEX \`IDX_item_name\` ON \`item\` (\`name\`)`);
    }
    if (!(await ix("item", "IDX_item_code"))) {
      await queryRunner.query(`CREATE INDEX \`IDX_item_code\` ON \`item\` (\`code\`)`);
    }
    if (!(await ix("item", "FK_item_category"))) {
      await queryRunner.query(`CREATE INDEX \`FK_item_category\` ON \`item\` (\`item_category_id\`)`);
    }
    if (!(await ix("inventory", "IDX_inventory_reorder_point"))) {
      await queryRunner.query(`CREATE INDEX \`IDX_inventory_reorder_point\` ON \`inventory\` (\`reorder_point\`)`);
    }
    if (!(await ix("inventory", "IDX_inventory_quantity_composite"))) {
      await queryRunner.query(
        `CREATE INDEX \`IDX_inventory_quantity_composite\` ON \`inventory\` (\`quantity\`, \`reserved_quantity\`)`,
      );
    }
    if (!(await ix("notifications", "IDX_notifications_user_status"))) {
      await queryRunner.query(
        `CREATE INDEX \`IDX_notifications_user_status\` ON \`notifications\` (\`user_id\`, \`status\`)`,
      );
    }

    if (!(await ix("user", "IDX_user_username"))) {
      await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_user_username\` ON \`user\` (\`username\`)`);
    }
    if (!(await ix("user", "IDX_user_refreshToken"))) {
      await queryRunner.query(`CREATE INDEX \`IDX_user_refreshToken\` ON \`user\` (\`refreshToken\`)`);
    }
    if (!(await ix("user", "IDX_user_status"))) {
      await queryRunner.query(`CREATE INDEX \`IDX_user_status\` ON \`user\` (\`status\`)`);
    }

    if (!(await ix("pricelist_item", "IDX_pricelist_item_composite"))) {
      await queryRunner.query(
        `CREATE INDEX \`IDX_pricelist_item_composite\` ON \`pricelist_item\` (\`pricelist_id\`, \`item_id\`)`,
      );
    }
    const hasPic = await this.columnExists(queryRunner, "pricelist_item_audit", "pricelist_item_id");
    if (hasPic && !(await ix("pricelist_item_audit", "IDX_pricelist_item_audit_composite"))) {
      await queryRunner.query(
        `CREATE INDEX \`IDX_pricelist_item_audit_composite\` ON \`pricelist_item_audit\` (\`pricelist_item_id\`, \`changed_at\`)`,
      );
    }
    const hasIa = await this.columnExists(queryRunner, "item_audit", "item_id");
    if (hasIa && !(await ix("item_audit", "IDX_item_audit_composite"))) {
      await queryRunner.query(
        `CREATE INDEX \`IDX_item_audit_composite\` ON \`item_audit\` (\`item_id\`, \`changed_at\`)`,
      );
    }
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS \`pricelist_item_audit\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`item_audit\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`production_preparation\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`production_issue\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`supplier_transaction\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`supplier_payment\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`inventory_transaction\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`purchase_order_item\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`purchase_order\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`inventory\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`supplier\``);
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
};

/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * SQLite-compatible initial schema.
 * Equivalent to 0000-SyncAllEntities.cjs but without MySQL-specific syntax:
 *   - No ENGINE=InnoDB, CHARSET, COLLATE
 *   - ENUM → TEXT
 *   - TINYINT(1) → INTEGER
 *   - DOUBLE/DECIMAL → REAL
 *   - INT UNSIGNED → INTEGER
 *   - AUTO_INCREMENT → AUTOINCREMENT (on INTEGER PRIMARY KEY)
 *   - Inline KEY definitions removed (created as separate CREATE INDEX statements)
 *   - INFORMATION_SCHEMA checks → sqlite_master checks
 */
module.exports = class InitialSchemaSqlite1700000000000 {
  name = "InitialSchemaSqlite1700000000000";

  async up(queryRunner) {
    await queryRunner.query(`PRAGMA foreign_keys = ON`);
    await this.createCoreTables(queryRunner);
    await this.createExtendedTables(queryRunner);
    await this.createIndexes(queryRunner);
  }

  async createCoreTables(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "permission_scope" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "permissions" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "scope_id" INTEGER DEFAULT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        FOREIGN KEY ("scope_id") REFERENCES "permission_scope" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_permissions" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "role_id" INTEGER DEFAULT NULL,
        "permission_id" INTEGER DEFAULT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "username" TEXT NOT NULL,
        "lastName" TEXT NOT NULL,
        "firstName" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "refreshToken" TEXT DEFAULT NULL,
        "is_locked" INTEGER NOT NULL DEFAULT 0,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_user_username" ON "user" ("username")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_roles" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "user_id" INTEGER DEFAULT NULL,
        "role_id" INTEGER DEFAULT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "category" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'active',
        "code" TEXT DEFAULT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_category_code" ON "category" ("code")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "item" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "item_category_id" INTEGER DEFAULT NULL,
        "default_unit_id" INTEGER DEFAULT NULL,
        "is_group" INTEGER DEFAULT NULL,
        "is_stock" INTEGER DEFAULT 0,
        "allow_negative_inventory" INTEGER DEFAULT 0,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        FOREIGN KEY ("item_category_id") REFERENCES "category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "item_group" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "item_id" INTEGER DEFAULT NULL,
        "sub_item_id" INTEGER DEFAULT NULL,
        "portion_size" REAL NOT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        FOREIGN KEY ("item_id") REFERENCES "item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("sub_item_id") REFERENCES "item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "station" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'inactive',
        "description" TEXT,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pricelist" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "code" TEXT DEFAULT NULL,
        "status" TEXT DEFAULT 'inactive',
        "is_default" INTEGER NOT NULL DEFAULT 0,
        "description" TEXT,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pricelist_code" ON "pricelist" ("code")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "station_pricelist" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "station_id" INTEGER DEFAULT NULL,
        "pricelist_id" INTEGER DEFAULT NULL,
        "is_default" INTEGER NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'active',
        "notes" TEXT,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        UNIQUE ("station_id", "pricelist_id"),
        FOREIGN KEY ("station_id") REFERENCES "station" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("pricelist_id") REFERENCES "pricelist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pricelist_item" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "pricelist_id" INTEGER DEFAULT NULL,
        "item_id" INTEGER DEFAULT NULL,
        "price" REAL NOT NULL DEFAULT 0,
        "currency" TEXT DEFAULT NULL,
        "is_enabled" INTEGER NOT NULL DEFAULT 1,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        FOREIGN KEY ("pricelist_id") REFERENCES "pricelist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("item_id") REFERENCES "item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_station" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "user_id" INTEGER DEFAULT NULL,
        "station_id" INTEGER DEFAULT NULL,
        "is_default" INTEGER DEFAULT NULL,
        "status" TEXT DEFAULT 'active',
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("station_id") REFERENCES "station" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bill" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "user_id" INTEGER DEFAULT NULL,
        "status" TEXT DEFAULT NULL,
        "total" REAL DEFAULT NULL,
        "cleared_by" INTEGER DEFAULT NULL,
        "cleared_at" DATETIME DEFAULT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "request_id" TEXT DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        "station_id" INTEGER DEFAULT NULL,
        "reopen_reason" TEXT,
        "reopened_by" INTEGER DEFAULT NULL,
        "reopened_at" DATETIME DEFAULT NULL,
        "notes" TEXT,
        UNIQUE ("request_id"),
        FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        FOREIGN KEY ("station_id") REFERENCES "station" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bill_item" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "item_id" INTEGER DEFAULT NULL,
        "bill_id" INTEGER DEFAULT NULL,
        "quantity" INTEGER NOT NULL DEFAULT 0,
        "subtotal" REAL NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "void_reason" TEXT,
        "void_requested_by" INTEGER DEFAULT NULL,
        "void_requested_at" DATETIME DEFAULT NULL,
        "void_approved_by" INTEGER DEFAULT NULL,
        "void_approved_at" DATETIME DEFAULT NULL,
        "requested_quantity" INTEGER DEFAULT NULL,
        "quantity_change_reason" TEXT,
        "quantity_change_requested_by" INTEGER DEFAULT NULL,
        "quantity_change_requested_at" DATETIME DEFAULT NULL,
        "quantity_change_approved_by" INTEGER DEFAULT NULL,
        "quantity_change_approved_at" DATETIME DEFAULT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        FOREIGN KEY ("item_id") REFERENCES "item" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        FOREIGN KEY ("bill_id") REFERENCES "bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "debit_amount" REAL NOT NULL DEFAULT 0,
        "credit_amount" REAL NOT NULL DEFAULT 0,
        "payment_type" TEXT NOT NULL,
        "paid_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "reference" TEXT DEFAULT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_by" INTEGER NOT NULL,
        "updated_by" INTEGER DEFAULT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bill_payment" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "bill_id" INTEGER DEFAULT NULL,
        "payment_id" INTEGER DEFAULT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_by" INTEGER NOT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        FOREIGN KEY ("bill_id") REFERENCES "bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("payment_id") REFERENCES "payment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "type" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "data" TEXT DEFAULT NULL,
        "status" TEXT NOT NULL DEFAULT 'unread',
        "user_id" INTEGER NOT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("created_by") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "credit_note" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "bill_id" INTEGER DEFAULT NULL,
        "credit_amount" REAL DEFAULT NULL,
        "reason" TEXT,
        "notes" TEXT,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "processed_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "processed_by" INTEGER DEFAULT NULL,
        FOREIGN KEY ("bill_id") REFERENCES "bill" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        FOREIGN KEY ("created_by") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        FOREIGN KEY ("processed_by") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reopen_reasons" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "reason_key" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "is_active" INTEGER NOT NULL DEFAULT 1,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        UNIQUE ("reason_key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bill_void_request" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "bill_id" INTEGER NOT NULL,
        "initiated_by" INTEGER NOT NULL,
        "approved_by" INTEGER DEFAULT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "reason" TEXT,
        "approval_notes" TEXT,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "approved_at" DATETIME DEFAULT NULL,
        "updated_at" DATETIME DEFAULT NULL,
        "paper_approval_received" INTEGER NOT NULL DEFAULT 0,
        "paper_approval_date" DATETIME DEFAULT NULL,
        "paper_approval_notes" TEXT,
        FOREIGN KEY ("bill_id") REFERENCES "bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("initiated_by") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        FOREIGN KEY ("approved_by") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory_item" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "item_id" INTEGER DEFAULT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        FOREIGN KEY ("item_id") REFERENCES "item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
  }

  async createExtendedTables(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "supplier" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "contact_person" TEXT DEFAULT NULL,
        "email" TEXT DEFAULT NULL,
        "phone" TEXT DEFAULT NULL,
        "address" TEXT DEFAULT NULL,
        "credit_limit" REAL NOT NULL DEFAULT 0,
        "payment_terms" TEXT DEFAULT NULL,
        "status" TEXT NOT NULL DEFAULT 'active',
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "item_id" INTEGER NOT NULL,
        "quantity" INTEGER NOT NULL DEFAULT 0,
        "reserved_quantity" INTEGER NOT NULL DEFAULT 0,
        "min_stock_level" INTEGER DEFAULT NULL,
        "max_stock_level" INTEGER DEFAULT NULL,
        "reorder_point" INTEGER DEFAULT NULL,
        "last_restocked_at" DATETIME DEFAULT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        UNIQUE ("item_id"),
        FOREIGN KEY ("item_id") REFERENCES "item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "purchase_order" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "supplier_id" INTEGER NOT NULL,
        "order_number" TEXT NOT NULL,
        "order_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expected_delivery_date" DATETIME DEFAULT NULL,
        "status" TEXT NOT NULL DEFAULT 'draft',
        "total_amount" REAL NOT NULL DEFAULT 0,
        "notes" TEXT DEFAULT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        UNIQUE ("order_number"),
        FOREIGN KEY ("supplier_id") REFERENCES "supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "purchase_order_item" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "purchase_order_id" INTEGER NOT NULL,
        "item_id" INTEGER NOT NULL,
        "quantity_ordered" INTEGER NOT NULL,
        "quantity_received" INTEGER NOT NULL DEFAULT 0,
        "unit_price" REAL NOT NULL,
        "subtotal" REAL NOT NULL DEFAULT 0,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("item_id") REFERENCES "item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory_transaction" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "item_id" INTEGER NOT NULL,
        "transaction_type" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL,
        "reference_type" TEXT DEFAULT NULL,
        "reference_id" INTEGER DEFAULT NULL,
        "notes" TEXT DEFAULT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        FOREIGN KEY ("item_id") REFERENCES "item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "supplier_payment" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "supplier_id" INTEGER NOT NULL,
        "payment_id" INTEGER NOT NULL,
        "amount_paid" REAL NOT NULL DEFAULT 0,
        "amount_received" REAL NOT NULL DEFAULT 0,
        "reference" TEXT DEFAULT NULL,
        "notes" TEXT DEFAULT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        FOREIGN KEY ("supplier_id") REFERENCES "supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        FOREIGN KEY ("payment_id") REFERENCES "payment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "supplier_transaction" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "supplier_id" INTEGER NOT NULL,
        "transaction_type" TEXT NOT NULL,
        "debit_amount" REAL NOT NULL DEFAULT 0,
        "credit_amount" REAL NOT NULL DEFAULT 0,
        "reference_type" TEXT DEFAULT NULL,
        "reference_id" INTEGER DEFAULT NULL,
        "notes" TEXT DEFAULT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        FOREIGN KEY ("supplier_id") REFERENCES "supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "production_issue" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "item_id" INTEGER NOT NULL,
        "quantity_produced" INTEGER NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'draft',
        "issued_by" INTEGER DEFAULT NULL,
        "issued_at" DATETIME DEFAULT NULL,
        "notes" TEXT DEFAULT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        FOREIGN KEY ("item_id") REFERENCES "item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        FOREIGN KEY ("issued_by") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "production_preparation" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "item_id" INTEGER NOT NULL,
        "quantity_prepared" INTEGER NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "prepared_by" INTEGER DEFAULT NULL,
        "prepared_at" DATETIME DEFAULT NULL,
        "issued_by" INTEGER DEFAULT NULL,
        "issued_at" DATETIME DEFAULT NULL,
        "notes" TEXT DEFAULT NULL,
        "rejection_reason" TEXT DEFAULT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME DEFAULT NULL,
        "created_by" INTEGER DEFAULT NULL,
        "updated_by" INTEGER DEFAULT NULL,
        FOREIGN KEY ("item_id") REFERENCES "item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        FOREIGN KEY ("prepared_by") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        FOREIGN KEY ("issued_by") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pricelist_item_audit" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "pricelist_item_id" INTEGER NOT NULL,
        "field_name" TEXT NOT NULL,
        "old_value" TEXT NULL,
        "new_value" TEXT NULL,
        "changed_by" INTEGER NULL,
        "changed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "change_reason" TEXT NULL,
        FOREIGN KEY ("pricelist_item_id") REFERENCES "pricelist_item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("changed_by") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "item_audit" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "item_id" INTEGER NOT NULL,
        "field_name" TEXT NOT NULL,
        "old_value" TEXT NULL,
        "new_value" TEXT NULL,
        "changed_by" INTEGER NULL,
        "changed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "change_reason" TEXT NULL,
        FOREIGN KEY ("item_id") REFERENCES "item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("changed_by") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);
  }

  async createIndexes(queryRunner) {
    // category
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_category_status" ON "category" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_category_created_at" ON "category" ("created_at")`);

    // item
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_item_created_at" ON "item" ("created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_item_name" ON "item" ("name")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_item_code" ON "item" ("code")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "FK_item_category" ON "item" ("item_category_id")`);

    // user
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_refreshToken" ON "user" ("refreshToken")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_status" ON "user" ("status")`);

    // station_pricelist
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_station_pricelist_station_default" ON "station_pricelist" ("station_id", "is_default")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_station_pricelist_pricelist_status" ON "station_pricelist" ("pricelist_id", "status")`);

    // user_station
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_station_user_status" ON "user_station" ("user_id", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_station_user_default_status" ON "user_station" ("user_id", "is_default", "status")`);

    // bill
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bill_user_created" ON "bill" ("user_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bill_status_created" ON "bill" ("status", "created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bill_station_created" ON "bill" ("station_id", "created_at")`);

    // bill_item
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bill_item_bill_created" ON "bill_item" ("bill_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bill_item_item_status" ON "bill_item" ("item_id", "status")`);

    // bill_void_request
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bill_void_request_bill_status" ON "bill_void_request" ("bill_id", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bill_void_request_initiated_created" ON "bill_void_request" ("initiated_by", "created_at")`);

    // pricelist_item
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_pricelist_item_composite" ON "pricelist_item" ("pricelist_id", "item_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "FK_pricelist_item_pricelist" ON "pricelist_item" ("pricelist_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "FK_pricelist_item_item" ON "pricelist_item" ("item_id")`);

    // pricelist_item_audit
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_pricelist_item_audit_composite" ON "pricelist_item_audit" ("pricelist_item_id", "changed_at")`);

    // item_audit
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_item_audit_composite" ON "item_audit" ("item_id", "changed_at")`);

    // supplier
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_supplier_status" ON "supplier" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_supplier_name" ON "supplier" ("name")`);

    // inventory
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inventory_item_id" ON "inventory" ("item_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inventory_quantity" ON "inventory" ("quantity")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inventory_reorder_point" ON "inventory" ("reorder_point")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inventory_quantity_composite" ON "inventory" ("quantity", "reserved_quantity")`);

    // inventory_transaction
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inventory_transaction_item_id" ON "inventory_transaction" ("item_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inventory_transaction_type" ON "inventory_transaction" ("transaction_type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inventory_transaction_created_at" ON "inventory_transaction" ("created_at")`);

    // purchase_order
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_purchase_order_status" ON "purchase_order" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_purchase_order_supplier_id" ON "purchase_order" ("supplier_id")`);

    // notifications
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "FK_notifications_user" ON "notifications" ("user_id")`);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "pricelist_item_audit"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "item_audit"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "production_preparation"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "production_issue"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "supplier_transaction"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "supplier_payment"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_transaction"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_order_item"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_order"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "supplier"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_item"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bill_void_request"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reopen_reasons"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "credit_note"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bill_payment"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bill_item"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bill"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_station"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pricelist_item"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "station_pricelist"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pricelist"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "station"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "item_group"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "item"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "category"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permission_scope"`);
  }
};

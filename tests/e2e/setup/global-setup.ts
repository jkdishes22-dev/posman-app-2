import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

const TEST_DB_PATH = path.join(process.cwd(), ".test-db", "posman-test.db");

/**
 * Patches TypeORM's AbstractSqliteDriver so that entity columns declared with
 * `type: "enum"` pass validation against SQLite.  SQLite itself stores these
 * as TEXT/VARCHAR — the migration SQL already handles this correctly.  Without
 * the patch, TypeORM throws DataTypeNotSupportedError on DataSource.initialize().
 */
async function patchSqliteEnumSupport() {
  // The CJS build is what TypeORM resolves at runtime
  const driverModule = await import(
    // @ts-ignore — internal TypeORM path, no types available
    "typeorm/driver/sqlite-abstract/AbstractSqliteDriver.js"
  );
  const AbstractSqliteDriver =
    (driverModule.AbstractSqliteDriver ?? driverModule.default) as any;

  if (!AbstractSqliteDriver) return;

  // @ts-ignore — union type from dynamic import; .prototype exists at runtime
  const orig = AbstractSqliteDriver.prototype.normalizeType;
  // @ts-ignore
  AbstractSqliteDriver.prototype.normalizeType = function (column: any) {
    // Treat enum the same as varchar — SQLite stores it as text anyway
    if (column.type === "enum") return "varchar";
    return orig.call(this, column);
  };
}

/**
 * Runs ONCE before all test files.
 * Creates the SQLite test database and runs all migrations (schema + seeds).
 * The migrated DB is then shared across all test files in the run.
 */
export async function setup() {
  // Set env vars before ANY dynamic imports so data-source.factory.ts
  // picks up DB_MODE=sqlite and the correct SQLITE_DB_PATH.
  process.env.DB_MODE = "sqlite";
  process.env.SQLITE_DB_PATH = TEST_DB_PATH;
  process.env.JWT_SECRET = "e2e-test-jwt-secret";
  (process.env as any).NODE_ENV = "test";
  process.env.ADMIN_USERNAME = "admin";
  process.env.ADMIN_PASSWORD = "admin123";

  // Patch TypeORM BEFORE importing AppDataSource so the fixed normalizeType
  // is in place when createAppDataSource() runs inside data-source.factory.ts
  await patchSqliteEnumSupport();

  // Ensure directory exists and start with a clean DB
  fs.mkdirSync(path.dirname(TEST_DB_PATH), { recursive: true });
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  // Clear any Playwright spec state files — they cache JWTs that expire or
  // belong to a previous seed's user IDs, causing stale-token redirects.
  const dbDir = path.dirname(TEST_DB_PATH);
  for (const f of fs.readdirSync(dbDir)) {
    if (f.endsWith("-state.json")) fs.unlinkSync(path.join(dbDir, f));
  }

  // Dynamic import AFTER env vars are set — this ensures AppDataSource is
  // created with the SQLite config (not MySQL).
  const { AppDataSource } = await import(
    "../../../src/backend/config/data-source.js"
  );

  await AppDataSource.initialize();
  await AppDataSource.runMigrations();

  // The must_change_password migration sets the flag for the seeded "admin" user.
  // Clear it in the test DB so E2E tests that log in as admin land on /admin as expected.
  await AppDataSource.query(
    `UPDATE "user" SET "must_change_password" = 0 WHERE "username" = 'admin'`,
  );

  // Seed a supervisor user for bill lifecycle tests.
  // admin/cashier/sales each lack some bill permission; supervisor has full billing access
  // (can_add_bill + can_close_bill + can_view_bill + can_add_bill_item).
  const hashedPw = await bcrypt.hash("supervisor123", 10);
  const supervisorRows = await AppDataSource.query(
    `SELECT id FROM "user" WHERE username = ?`,
    ["e2e_supervisor_bills"],
  );
  if (supervisorRows.length === 0) {
    const insertResult = await AppDataSource.query(
      `INSERT INTO "user" (username, firstName, lastName, password, status, is_locked, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', 0, CURRENT_TIMESTAMP, NULL)`,
      ["e2e_supervisor_bills", "E2E", "Supervisor", hashedPw],
    );
    const supervisorUserId: number =
      typeof insertResult === "object" && insertResult !== null && "insertId" in insertResult
        ? (insertResult as any).insertId
        : Number(insertResult);
    const supervisorRoleRows = await AppDataSource.query(
      `SELECT id FROM "roles" WHERE name = ?`,
      ["supervisor"],
    );
    if (supervisorRoleRows.length > 0 && supervisorUserId) {
      await AppDataSource.query(
        `INSERT INTO "user_roles" (user_id, role_id, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, NULL)`,
        [supervisorUserId, supervisorRoleRows[0].id],
      );
    }
  }

  // Seed a sales user for auth coverage tests.
  const salesHashedPw = await bcrypt.hash("sales123", 10);
  const salesRows = await AppDataSource.query(
    `SELECT id FROM "user" WHERE username = ?`,
    ["e2e_sales"],
  );
  if (salesRows.length === 0) {
    const insertResult = await AppDataSource.query(
      `INSERT INTO "user" (username, firstName, lastName, password, status, is_locked, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', 0, CURRENT_TIMESTAMP, NULL)`,
      ["e2e_sales", "E2E", "Sales", salesHashedPw],
    );
    const salesUserId: number =
      typeof insertResult === "object" && insertResult !== null && "insertId" in insertResult
        ? (insertResult as any).insertId
        : Number(insertResult);
    const salesRoleRows = await AppDataSource.query(
      `SELECT id FROM "roles" WHERE name = ?`,
      ["sales"],
    );
    if (salesRoleRows.length > 0 && salesUserId) {
      await AppDataSource.query(
        `INSERT INTO "user_roles" (user_id, role_id, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, NULL)`,
        [salesUserId, salesRoleRows[0].id],
      );
    }
  }

  // Seed a storekeeper user for auth coverage tests.
  const storekeeperHashedPw = await bcrypt.hash("storekeeper123", 10);
  const storekeeperRows = await AppDataSource.query(
    `SELECT id FROM "user" WHERE username = ?`,
    ["e2e_storekeeper"],
  );
  if (storekeeperRows.length === 0) {
    const insertResult = await AppDataSource.query(
      `INSERT INTO "user" (username, firstName, lastName, password, status, is_locked, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', 0, CURRENT_TIMESTAMP, NULL)`,
      ["e2e_storekeeper", "E2E", "Storekeeper", storekeeperHashedPw],
    );
    const storekeeperUserId: number =
      typeof insertResult === "object" && insertResult !== null && "insertId" in insertResult
        ? (insertResult as any).insertId
        : Number(insertResult);
    const storekeeperRoleRows = await AppDataSource.query(
      `SELECT id FROM "roles" WHERE name = ?`,
      ["storekeeper"],
    );
    if (storekeeperRoleRows.length > 0 && storekeeperUserId) {
      await AppDataSource.query(
        `INSERT INTO "user_roles" (user_id, role_id, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, NULL)`,
        [storekeeperUserId, storekeeperRoleRows[0].id],
      );
    }
  }

  // Seed a cashier user for report auth coverage tests.
  const cashierHashedPw = await bcrypt.hash("cashier123", 10);
  const cashierRows = await AppDataSource.query(
    `SELECT id FROM "user" WHERE username = ?`,
    ["e2e_cashier"],
  );
  if (cashierRows.length === 0) {
    const insertResult = await AppDataSource.query(
      `INSERT INTO "user" (username, firstName, lastName, password, status, is_locked, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', 0, CURRENT_TIMESTAMP, NULL)`,
      ["e2e_cashier", "E2E", "Cashier", cashierHashedPw],
    );
    const cashierUserId: number =
      typeof insertResult === "object" && insertResult !== null && "insertId" in insertResult
        ? (insertResult as any).insertId
        : Number(insertResult);
    const cashierRoleRows = await AppDataSource.query(
      `SELECT id FROM "roles" WHERE name = ?`,
      ["cashier"],
    );
    if (cashierRoleRows.length > 0 && cashierUserId) {
      await AppDataSource.query(
        `INSERT INTO "user_roles" (user_id, role_id, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, NULL)`,
        [cashierUserId, cashierRoleRows[0].id],
      );
    }
  }

  // Seed a second sales user dedicated to journey-admin-sales-cashier.spec.ts
  // so it doesn't share station assignments with e2e_sales used by billing.spec.ts.
  const sales2HashedPw = await bcrypt.hash("sales123", 10);
  const sales2Rows = await AppDataSource.query(
    `SELECT id FROM "user" WHERE username = ?`,
    ["e2e_sales2"],
  );
  if (sales2Rows.length === 0) {
    const insertResult = await AppDataSource.query(
      `INSERT INTO "user" (username, firstName, lastName, password, status, is_locked, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', 0, CURRENT_TIMESTAMP, NULL)`,
      ["e2e_sales2", "E2E", "Sales", sales2HashedPw],
    );
    const sales2UserId: number =
      typeof insertResult === "object" && insertResult !== null && "insertId" in insertResult
        ? (insertResult as any).insertId
        : Number(insertResult);
    const sales2RoleRows = await AppDataSource.query(
      `SELECT id FROM "roles" WHERE name = ?`,
      ["sales"],
    );
    if (sales2RoleRows.length > 0 && sales2UserId) {
      await AppDataSource.query(
        `INSERT INTO "user_roles" (user_id, role_id, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, NULL)`,
        [sales2UserId, sales2RoleRows[0].id],
      );
    }
  }

  // Seed a third sales user dedicated to journey-sales-create-bill.spec.ts.
  const sales3HashedPw = await bcrypt.hash("sales123", 10);
  const sales3Rows = await AppDataSource.query(
    `SELECT id FROM "user" WHERE username = ?`,
    ["e2e_sales3"],
  );
  if (sales3Rows.length === 0) {
    const insertResult = await AppDataSource.query(
      `INSERT INTO "user" (username, firstName, lastName, password, status, is_locked, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', 0, CURRENT_TIMESTAMP, NULL)`,
      ["e2e_sales3", "E2E", "Sales", sales3HashedPw],
    );
    const sales3UserId: number =
      typeof insertResult === "object" && insertResult !== null && "insertId" in insertResult
        ? (insertResult as any).insertId
        : Number(insertResult);
    const sales3RoleRows = await AppDataSource.query(
      `SELECT id FROM "roles" WHERE name = ?`,
      ["sales"],
    );
    if (sales3RoleRows.length > 0 && sales3UserId) {
      await AppDataSource.query(
        `INSERT INTO "user_roles" (user_id, role_id, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, NULL)`,
        [sales3UserId, sales3RoleRows[0].id],
      );
    }
  }

  // Seed a second cashier user dedicated to journey-admin-sales-cashier.spec.ts.
  const cashier2HashedPw = await bcrypt.hash("cashier123", 10);
  const cashier2Rows = await AppDataSource.query(
    `SELECT id FROM "user" WHERE username = ?`,
    ["e2e_cashier2"],
  );
  if (cashier2Rows.length === 0) {
    const insertResult = await AppDataSource.query(
      `INSERT INTO "user" (username, firstName, lastName, password, status, is_locked, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', 0, CURRENT_TIMESTAMP, NULL)`,
      ["e2e_cashier2", "E2E", "Cashier", cashier2HashedPw],
    );
    const cashier2UserId: number =
      typeof insertResult === "object" && insertResult !== null && "insertId" in insertResult
        ? (insertResult as any).insertId
        : Number(insertResult);
    const cashier2RoleRows = await AppDataSource.query(
      `SELECT id FROM "roles" WHERE name = ?`,
      ["cashier"],
    );
    if (cashier2RoleRows.length > 0 && cashier2UserId) {
      await AppDataSource.query(
        `INSERT INTO "user_roles" (user_id, role_id, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, NULL)`,
        [cashier2UserId, cashier2RoleRows[0].id],
      );
    }
  }

  await AppDataSource.destroy();

  console.log("\n✅ E2E test database ready:", TEST_DB_PATH);
}

/**
 * Runs ONCE after all test files complete.
 */
export async function teardown() {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  const dir = path.dirname(TEST_DB_PATH);
  if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
  }
  console.log("\n🧹 E2E test database cleaned up");
}

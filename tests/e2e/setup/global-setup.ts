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
    driverModule.AbstractSqliteDriver ?? driverModule.default;

  if (!AbstractSqliteDriver) return;

  const orig = AbstractSqliteDriver.prototype.normalizeType;
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
  process.env.NODE_ENV = "test";
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

  // Dynamic import AFTER env vars are set — this ensures AppDataSource is
  // created with the SQLite config (not MySQL).
  const { AppDataSource } = await import(
    "../../../src/backend/config/data-source.js"
  );

  await AppDataSource.initialize();
  await AppDataSource.runMigrations();

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

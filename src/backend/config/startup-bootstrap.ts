import { DataSource } from "typeorm";
import { AppDataSource } from "@backend/config/data-source";
import { assertSqliteQuickCheckOrThrow } from "@backend/utils/sqliteIntegrity";

// Set to true by applyPendingMigrationsAtStartup so checkSqliteStatus skips a redundant
// runMigrations() call when the instrumentation hook already ran them in this process.
let migrationsAppliedThisProcess = false;

type SetupState =
  | "ready"
  | "db_server_unavailable"
  | "initialization_required"
  | "license_required"
  | "license_invalid"
  | "license_expired"
  | "initializing"
  | "failed";

interface SetupGuidance {
  title: string;
  steps: string[];
}

export interface SetupStatusPayload {
  state: SetupState;
  message: string;
  code:
    | "SETUP_READY"
    | "DB_SERVER_UNAVAILABLE"
    | "DB_INITIALIZATION_REQUIRED"
    | "LICENSE_REQUIRED"
    | "LICENSE_INVALID"
    | "LICENSE_EXPIRED"
    | "SETUP_INITIALIZING"
    | "SETUP_FAILED";
  guidance?: SetupGuidance;
  diagnostics?: {
    /** Resolved DB mode: sqlite when DB_MODE=sqlite, otherwise mysql (see data-source.factory). */
    effectiveDbMode?: "sqlite" | "mysql";
    /** Raw process.env.DB_MODE when set (empty string is a distinct value from unset). */
    dbModeEnv?: string;
    dbHost?: string;
    dbPort?: number;
    dbName?: string;
    originalCode?: string;
  };
}

export class StartupBootstrapError extends Error {
  setupStatus: SetupStatusPayload;
  httpStatus: number;

  constructor(setupStatus: SetupStatusPayload, httpStatus = 500) {
    super(setupStatus.message);
    this.name = "StartupBootstrapError";
    this.setupStatus = setupStatus;
    this.httpStatus = httpStatus;
  }
}

const isSqliteMode = (): boolean => process.env.DB_MODE === "sqlite";

function getEffectiveDbMode(): "sqlite" | "mysql" {
  return isSqliteMode() ? "sqlite" : "mysql";
}

function modeDiagnostics(): NonNullable<SetupStatusPayload["diagnostics"]> {
  return {
    effectiveDbMode: getEffectiveDbMode(),
    ...(process.env.DB_MODE !== undefined ? { dbModeEnv: process.env.DB_MODE } : {}),
  };
}

type MySqlConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};

type BootstrapState = {
  current: SetupStatusPayload;
  checkPromise: Promise<SetupStatusPayload> | null;
  initPromise: Promise<SetupStatusPayload> | null;
};

const bootstrapState: BootstrapState = {
  current: {
    state: "initializing",
    message: "Checking database setup status...",
    code: "SETUP_INITIALIZING",
    diagnostics: modeDiagnostics(),
  },
  checkPromise: null,
  initPromise: null,
};

function getDbConfig(): MySqlConfig {
  return {
    host: process.env.DB_HOST || process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || "3306", 10),
    username: process.env.DB_USER || process.env.MYSQL_USERNAME || "root",
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "password",
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE || "test",
  };
}

function createSystemDataSource(config: MySqlConfig): DataSource {
  return new DataSource({
    type: "mysql",
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: "mysql",
    synchronize: false,
    entities: [],
    extra: {
      connectTimeout: 15000,
    },
  });
}

function createTargetDataSource(config: MySqlConfig): DataSource {
  return new DataSource({
    type: "mysql",
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
    synchronize: false,
    entities: [],
    extra: {
      connectTimeout: 15000,
    },
  });
}

function getUnavailableStatus(error: any): SetupStatusPayload {
  const config = getDbConfig();
  return {
    state: "db_server_unavailable",
    message:
      "Database server is unavailable. Start MySQL and verify DB_HOST/DB_PORT/credentials, then retry setup.",
    code: "DB_SERVER_UNAVAILABLE",
    guidance: {
      title: "Database server unavailable",
      steps: [
        "Start the MySQL service.",
        "Verify DB_HOST, DB_PORT, DB_USER, and DB_PASSWORD in your environment.",
        "Check network/firewall access to the database host.",
        "Retry setup from the login screen.",
      ],
    },
    diagnostics: {
      ...modeDiagnostics(),
      dbHost: config.host,
      dbPort: config.port,
      dbName: config.database,
      originalCode: error?.code,
    },
  };
}

function getInitializationRequiredStatus(): SetupStatusPayload {
  if (isSqliteMode()) {
    return {
      state: "initialization_required",
      message:
        "Database not initialized. Run initial setup to create tables and seed data.",
      code: "DB_INITIALIZATION_REQUIRED",
      guidance: {
        title: "Initial setup required",
        steps: [
          "Confirm initial setup from the login screen.",
          "The app will create the local database file automatically.",
          "Migrations will run automatically (roles, permissions, and admin seed included).",
        ],
      },
      diagnostics: modeDiagnostics(),
    };
  }

  const config = getDbConfig();
  return {
    state: "initialization_required",
    message:
      "Database is reachable but not initialized. Run initial setup to create the database and apply migrations.",
    code: "DB_INITIALIZATION_REQUIRED",
    guidance: {
      title: "Initial setup required",
      steps: [
        "Confirm initial setup from the login screen.",
        "The app will create the database if missing.",
        "Migrations will run automatically (roles, permissions, and admin seed included).",
      ],
    },
    diagnostics: {
      ...modeDiagnostics(),
      dbHost: config.host,
      dbPort: config.port,
      dbName: config.database,
    },
  };
}

function getReadyStatus(): SetupStatusPayload {
  return {
    state: "ready",
    message: "Database is ready.",
    code: "SETUP_READY",
    diagnostics: modeDiagnostics(),
  };
}

function getLicenseRequiredStatus(message: string): SetupStatusPayload {
  return {
    state: "license_required",
    message,
    code: "LICENSE_REQUIRED",
    guidance: {
      title: "License activation required",
      steps: [
        "Enter a valid license code on the login screen.",
        "If your trial expired, request a renewal code from the author.",
      ],
    },
    diagnostics: modeDiagnostics(),
  };
}

function getLicenseInvalidStatus(message: string): SetupStatusPayload {
  return {
    state: "license_invalid",
    message,
    code: "LICENSE_INVALID",
    guidance: {
      title: "License validation failed",
      steps: [
        "Use a valid signed license code issued by the author.",
        "If this machine changed, request a replacement license.",
      ],
    },
    diagnostics: modeDiagnostics(),
  };
}

function getLicenseExpiredStatus(message: string): SetupStatusPayload {
  return {
    state: "license_expired",
    message,
    code: "LICENSE_EXPIRED",
    guidance: {
      title: "License expired",
      steps: [
        "Enter a new active license code to continue.",
        "Contact the author for your replacement or lifetime license.",
      ],
    },
    diagnostics: modeDiagnostics(),
  };
}

function getFailedStatus(error: any): SetupStatusPayload {
  if (isSqliteMode()) {
    return {
      state: "failed",
      message: `Database setup failed: ${error?.message || "Unknown error"}`,
      code: "SETUP_FAILED",
      diagnostics: {
        ...modeDiagnostics(),
        dbName: process.env.SQLITE_DB_PATH || "posman.db",
        originalCode: error?.code,
      },
    };
  }

  const config = getDbConfig();
  return {
    state: "failed",
    message: `Database setup failed: ${error?.message || "Unknown error"}`,
    code: "SETUP_FAILED",
    diagnostics: {
      ...modeDiagnostics(),
      dbHost: config.host,
      dbPort: config.port,
      dbName: config.database,
      originalCode: error?.code,
    },
  };
}

function mapToBootstrapError(status: SetupStatusPayload): StartupBootstrapError {
  if (status.state === "db_server_unavailable") {
    return new StartupBootstrapError(status, 503);
  }
  if (status.state === "initialization_required") {
    return new StartupBootstrapError(status, 428);
  }
  if (status.state === "license_required" || status.state === "license_expired") {
    return new StartupBootstrapError(status, 402);
  }
  if (status.state === "license_invalid") {
    return new StartupBootstrapError(status, 403);
  }
  return new StartupBootstrapError(status, 500);
}

function isDatabaseMissingError(error: any): boolean {
  return error?.code === "ER_BAD_DB_ERROR";
}

function isServerUnavailableError(error: any): boolean {
  return (
    error?.code === "ECONNREFUSED" ||
    error?.code === "ETIMEDOUT" ||
    error?.code === "ENOTFOUND" ||
    error?.code === "EHOSTUNREACH" ||
    error?.code === "ER_ACCESS_DENIED_ERROR"
  );
}

async function withSystemConnection<T>(
  callback: (source: DataSource, config: MySqlConfig) => Promise<T>,
): Promise<T> {
  const config = getDbConfig();
  const source = createSystemDataSource(config);
  await source.initialize();
  try {
    return await callback(source, config);
  } finally {
    if (source.isInitialized) {
      await source.destroy();
    }
  }
}

async function withTargetConnection<T>(
  callback: (source: DataSource, config: MySqlConfig) => Promise<T>,
): Promise<T> {
  const config = getDbConfig();
  const source = createTargetDataSource(config);
  await source.initialize();
  try {
    return await callback(source, config);
  } finally {
    if (source.isInitialized) {
      await source.destroy();
    }
  }
}

function escapeIdentifier(identifier: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(identifier)) {
    throw new Error(`Invalid database name: ${identifier}`);
  }
  return `\`${identifier}\``;
}

async function databaseExists(): Promise<boolean> {
  console.info("[startup-bootstrap] Checking if database exists");
  return withSystemConnection<boolean>(async (source, config) => {
    const result = await source.query(
      "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1",
      [config.database],
    );
    return Array.isArray(result) && result.length > 0;
  });
}

async function createDatabaseIfMissing(): Promise<void> {
  console.info("[startup-bootstrap] Creating database if missing");
  await withSystemConnection<void>(async (source, config) => {
    const dbIdentifier = escapeIdentifier(config.database);
    await source.query(`CREATE DATABASE IF NOT EXISTS ${dbIdentifier}`);
  });
}

async function hasCoreSchema(): Promise<boolean> {
  return withTargetConnection<boolean>(async source => {
    const requiredTables = ["user", "roles", "permissions", "user_roles", "role_permissions"];
    const result = await source.query(
      `SELECT TABLE_NAME
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN (${requiredTables.map(() => "?").join(",")})`,
      requiredTables,
    );
    return Array.isArray(result) && result.length === requiredTables.length;
  });
}

// --- SQLite-specific bootstrap ---

/**
 * Apply pending TypeORM migrations when the Node server process boots (Next instrumentation).
 * Covers fresh installs, Electron upgrades/restarts, and dev — before the first HTTP request.
 * Safe when called again from checkSqliteStatus / getConnection; already-applied revisions are skipped.
 */
export async function applyPendingMigrationsAtStartup(): Promise<void> {
  const sqlite = isSqliteMode();
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  } catch (err: any) {
    if (sqlite) {
      console.error("[startup] SQLite database init failed:", err?.message || err);
      throw err;
    }
    console.warn(
      "[startup] Database not reachable; migrations will run after the DB is available:",
      err?.message || err,
    );
    return;
  }

  try {
    const executed = await AppDataSource.runMigrations();
    const executedList = Array.isArray(executed) ? executed : [];
    if (executedList.length > 0) {
      console.info(
        `[startup] Applied ${executedList.length} pending migration(s): ${executedList.map((m) => m.name).join(", ")}`,
      );
    }
    migrationsAppliedThisProcess = true;
  } catch (err: any) {
    if (sqlite) {
      console.error("[startup] SQLite migrations failed:", err?.message || err);
      throw err;
    }
    console.warn("[startup] Migration run failed; will retry on first DB connection:", err?.message || err);
  }
}

async function checkSqliteStatus(): Promise<SetupStatusPayload> {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    // Always apply pending migrations — core tables alone are not enough (e.g. system_settings,
    // expenses). Previously we only checked five tables and skipped runMigrations forever after
    // first boot, leaving DBs stuck at an old migration revision.
    // Skip if the instrumentation hook already ran migrations in this process.
    if (!migrationsAppliedThisProcess) {
      await AppDataSource.runMigrations();
    }
    await assertSqliteQuickCheckOrThrow(AppDataSource);
    const requiredTables = ["user", "roles", "permissions", "user_roles", "role_permissions"];
    const placeholders = requiredTables.map(() => "?").join(",");
    const result = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name IN (${placeholders})`,
      requiredTables,
    );
    const count = parseInt(result?.[0]?.count ?? "0", 10);
    return count >= requiredTables.length ? getReadyStatus() : getInitializationRequiredStatus();
  } catch (error: any) {
    return getFailedStatus(error);
  }
}

async function runSqliteInitialization(): Promise<SetupStatusPayload> {
  try {
    console.info("[startup-bootstrap] Running SQLite initialization");
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    await AppDataSource.runMigrations();
    await assertSqliteQuickCheckOrThrow(AppDataSource);
    await ensureBaselineData();
    return getReadyStatus();
  } catch (error: any) {
    return getFailedStatus(error);
  }
}

// --- Shared ---

async function ensureBaselineData(): Promise<void> {
  const roleCountResult = await AppDataSource.query(
    "SELECT COUNT(*) as count FROM roles WHERE name IN ('admin', 'supervisor', 'sales', 'cashier', 'storekeeper')",
  );
  const adminUserResult = await AppDataSource.query(
    "SELECT COUNT(*) as count FROM user u INNER JOIN user_roles ur ON ur.user_id = u.id INNER JOIN roles r ON r.id = ur.role_id WHERE r.name = 'admin'",
  );

  const roleCount = parseInt(roleCountResult?.[0]?.count || "0", 10);
  const adminCount = parseInt(adminUserResult?.[0]?.count || "0", 10);

  if (roleCount < 5) {
    throw new Error("Default roles are incomplete after migration.");
  }
  if (adminCount < 1) {
    throw new Error(
      "Admin user was not created. Check ADMIN_USERNAME/ADMIN_PASSWORD environment variables.",
    );
  }
}

async function ensureSchemaAndMigrations(): Promise<void> {
  console.info("[startup-bootstrap] Ensuring schema and running migrations");
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  await AppDataSource.runMigrations();
  await ensureBaselineData();
}

async function checkStatusInternal(): Promise<SetupStatusPayload> {
  const { licenseService } = await import("@backend/licensing/LicenseService");
  if (isSqliteMode()) {
    const dbStatus = await checkSqliteStatus();
    if (dbStatus.state !== "ready") {
      return dbStatus;
    }
    try {
      const licenseStatus = await licenseService.getStatus();
      if (licenseStatus.state === "ready") {
        return dbStatus;
      }
      if (licenseStatus.state === "license_required") {
        return getLicenseRequiredStatus(licenseStatus.message);
      }
      if (licenseStatus.state === "license_expired") {
        return getLicenseExpiredStatus(licenseStatus.message);
      }
      return getLicenseInvalidStatus(licenseStatus.message);
    } catch (error: any) {
      return getLicenseInvalidStatus(
        error?.message || "License backend is unavailable in this environment.",
      );
    }
  }

  try {
    const exists = await databaseExists();
    if (!exists) {
      return getInitializationRequiredStatus();
    }

    const coreSchemaReady = await hasCoreSchema();
    if (!coreSchemaReady) {
      return getInitializationRequiredStatus();
    }

    const licenseStatus = await licenseService.getStatus();
    if (licenseStatus.state === "ready") {
      return getReadyStatus();
    }
    if (licenseStatus.state === "license_required") {
      return getLicenseRequiredStatus(licenseStatus.message);
    }
    if (licenseStatus.state === "license_expired") {
      return getLicenseExpiredStatus(licenseStatus.message);
    }
    return getLicenseInvalidStatus(licenseStatus.message);
  } catch (error: any) {
    if (isDatabaseMissingError(error)) {
      return getInitializationRequiredStatus();
    }
    if (isServerUnavailableError(error)) {
      return getUnavailableStatus(error);
    }
    return getFailedStatus(error);
  }
}

export async function getStartupSetupStatus(forceRefresh = false): Promise<SetupStatusPayload> {
  if (
    !forceRefresh &&
    (bootstrapState.current.state === "ready" ||
      bootstrapState.current.state === "db_server_unavailable" ||
      bootstrapState.current.state === "initialization_required" ||
      bootstrapState.current.state === "license_required" ||
      bootstrapState.current.state === "license_invalid" ||
      bootstrapState.current.state === "license_expired")
  ) {
    return bootstrapState.current;
  }

  if (bootstrapState.checkPromise) {
    return bootstrapState.checkPromise;
  }

  bootstrapState.checkPromise = (async () => {
    const status = await checkStatusInternal();
    bootstrapState.current = status;
    bootstrapState.checkPromise = null;
    return status;
  })();

  return bootstrapState.checkPromise;
}

export async function ensureStartupReadyForRequest(): Promise<void> {
  const cachedStatus = await getStartupSetupStatus();
  if (cachedStatus.state === "ready") {
    return;
  }

  const refreshedStatus = await getStartupSetupStatus(true);
  if (refreshedStatus.state === "ready") {
    return;
  }

  throw mapToBootstrapError(refreshedStatus);
}

export async function runStartupInitialization(): Promise<SetupStatusPayload> {
  if (bootstrapState.initPromise) {
    return bootstrapState.initPromise;
  }

  bootstrapState.current = {
    state: "initializing",
    message: "Initializing database setup...",
    code: "SETUP_INITIALIZING",
    diagnostics: modeDiagnostics(),
  };

  bootstrapState.initPromise = (async () => {
    try {
      if (isSqliteMode()) {
        const status = await runSqliteInitialization();
        bootstrapState.current = status;
        return status;
      }

      console.info("[startup-bootstrap] Running full initialization flow");
      await createDatabaseIfMissing();
      await ensureSchemaAndMigrations();
      const status = getReadyStatus();
      bootstrapState.current = status;
      return status;
    } catch (error: any) {
      const status = isServerUnavailableError(error)
        ? getUnavailableStatus(error)
        : getFailedStatus(error);
      bootstrapState.current = status;
      return status;
    } finally {
      bootstrapState.initPromise = null;
    }
  })();

  return bootstrapState.initPromise;
}

export function formatSetupErrorResponse(error: any): {
  status: number;
  body: {
    error: string;
    code: string;
    setupStatus: SetupStatusPayload;
  };
} {
  if (error instanceof StartupBootstrapError) {
    return {
      status: error.httpStatus,
      body: {
        error: error.setupStatus.message,
        code: error.setupStatus.code,
        setupStatus: error.setupStatus,
      },
    };
  }

  const fallback = getFailedStatus(error);
  return {
    status: 500,
    body: {
      error: fallback.message,
      code: fallback.code,
      setupStatus: fallback,
    },
  };
}

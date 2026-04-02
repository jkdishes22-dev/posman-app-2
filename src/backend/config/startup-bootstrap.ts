import { DataSource } from "typeorm";
import { AppDataSource } from "@backend/config/data-source";

type SetupState =
  | "ready"
  | "db_server_unavailable"
  | "initialization_required"
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
    | "SETUP_INITIALIZING"
    | "SETUP_FAILED";
  guidance?: SetupGuidance;
  diagnostics?: {
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
      dbHost: config.host,
      dbPort: config.port,
      dbName: config.database,
      originalCode: error?.code,
    },
  };
}

function getInitializationRequiredStatus(): SetupStatusPayload {
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
  };
}

function getFailedStatus(error: any): SetupStatusPayload {
  const config = getDbConfig();
  return {
    state: "failed",
    message: `Database setup failed: ${error?.message || "Unknown error"}`,
    code: "SETUP_FAILED",
    diagnostics: {
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
  try {
    const exists = await databaseExists();
    if (!exists) {
      return getInitializationRequiredStatus();
    }

    const coreSchemaReady = await hasCoreSchema();
    if (!coreSchemaReady) {
      return getInitializationRequiredStatus();
    }

    return getReadyStatus();
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
      bootstrapState.current.state === "initialization_required")
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
  };

  bootstrapState.initPromise = (async () => {
    try {
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

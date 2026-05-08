import { DataSource } from "typeorm";
import { createAppDataSource } from "./data-source.factory";

let connectionInstance: DataSource | null = null;
let isInitializing = false;

export const AppDataSource = createAppDataSource();

export const getConnection = async (): Promise<DataSource> => {
  if (!connectionInstance && AppDataSource.isInitialized) {
    connectionInstance = AppDataSource;
  }

  if (connectionInstance && connectionInstance.isInitialized) {
    return connectionInstance;
  }

  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return connectionInstance!;
  }

  isInitializing = true;
  try {
    const { ensureStartupReadyForRequest } = await import("./startup-bootstrap");
    await ensureStartupReadyForRequest();

    if (!connectionInstance) {
      // ensureStartupReadyForRequest may have already initialized AppDataSource
      // (e.g. checkSqliteStatus calls initialize). Avoid double-init.
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
      connectionInstance = AppDataSource;
    }
    return connectionInstance;
  } catch (error) {
    // Reset connection instance on error
    connectionInstance = null;
    throw error;
  } finally {
    isInitializing = false;
  }
};

export const closeConnection = async (): Promise<void> => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log("Database connection closed");
  }
  connectionInstance = null;
};

/**
 * Close TypeORM + clear Next API route connection cache. Use before replacing the SQLite file on disk.
 */
export const suspendDatabaseForFileOperations = async (): Promise<void> => {
  const { clearDbMiddlewareCache } = await import("@backend/middleware/dbMiddleware");
  clearDbMiddlewareCache();
  await closeConnection();
};

/**
 * Re-open DB after file swap: startup checks, initialize, migrations.
 */
export const resumeDatabaseAfterFileOperations = async (): Promise<void> => {
  const { ensureStartupReadyForRequest } = await import("./startup-bootstrap");
  await ensureStartupReadyForRequest();
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  await AppDataSource.runMigrations();
  connectionInstance = AppDataSource;
};

// Graceful shutdown handler - only set up if process.on exists (Node.js environment)
if (typeof process !== "undefined" && typeof process.on === "function") {
  process.on("SIGINT", async () => {
    await closeConnection();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await closeConnection();
    process.exit(0);
  });
}

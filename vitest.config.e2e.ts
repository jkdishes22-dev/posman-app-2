import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["tests/e2e/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/e2e/setup/global-setup.ts"],
    setupFiles: ["tests/e2e/setup/patch-sqlite.ts"],
    globals: true,
    // Single fork = all test files run sequentially in one process.
    // This prevents concurrent writes to the shared SQLite file.
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    testTimeout: 30000,
    // These env vars are injected into the worker BEFORE any module is imported.
    // DB_MODE=sqlite triggers the SQLite DataSource factory in data-source.factory.ts.
    env: {
      DB_MODE: "sqlite",
      SQLITE_DB_PATH: path.join(process.cwd(), ".test-db", "posman-test.db"),
      JWT_SECRET: "e2e-test-jwt-secret",
      NODE_ENV: "test",
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: "admin123",
    },
  },
});

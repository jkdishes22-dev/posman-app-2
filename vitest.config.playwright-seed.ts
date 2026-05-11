import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

// Runs only the DB seed (no tests, no teardown) so the SQLite file
// persists for the Playwright test run that follows.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: [],
    passWithNoTests: true,
    environment: "node",
    globalSetup: ["tests/playwright/seed-db.ts"],
    setupFiles: ["tests/e2e/setup/patch-sqlite.ts"],
    globals: true,
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
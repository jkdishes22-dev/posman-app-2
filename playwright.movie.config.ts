import { defineConfig, devices } from "@playwright/test";
import path from "path";

const TEST_DB_PATH = path.join(process.cwd(), ".test-db", "posman-test.db");

/**
 * Movie config — slower interactions + video recording.
 *
 * Run:
 *   npx vitest run --config vitest.config.playwright-seed.ts   # seed DB once
 *   npx playwright test --config playwright.movie.config.ts    # record
 *
 * Video files land in tests/playwright/movie/
 */
export default defineConfig({
  testDir: "tests/playwright",
  testMatch: "**/movie-*.spec.ts",
  timeout: 120_000,
  workers: 1,
  globalSetup: "./tests/playwright/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    launchOptions: {
      slowMo: 600,
    },
    video: "on",
    screenshot: "off",
    viewport: { width: 1400, height: 860 },
    actionTimeout: 20_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  outputDir: "tests/playwright/movie",
  webServer: {
    command: "next dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
    env: {
      DB_MODE: "sqlite",
      SQLITE_DB_PATH: TEST_DB_PATH,
      JWT_SECRET: "e2e-test-jwt-secret",
      NODE_ENV: "test",
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: "admin123",
      NEXTAUTH_URL: "http://localhost:3000",
      NEXTAUTH_SECRET: "e2e-nextauth-secret",
    },
  },
});

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const TEST_DB_PATH = path.join(process.cwd(), '.test-db', 'posman-test.db');

export default defineConfig({
  testDir: 'tests/playwright',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: 'tests/playwright/results',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      DB_MODE: 'sqlite',
      SQLITE_DB_PATH: TEST_DB_PATH,
      JWT_SECRET: 'e2e-test-jwt-secret',
      NODE_ENV: 'test',
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD: 'admin123',
      NEXTAUTH_URL: 'http://localhost:3000',
      NEXTAUTH_SECRET: 'e2e-nextauth-secret',
    },
  },
});
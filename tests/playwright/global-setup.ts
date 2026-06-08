import fs from 'fs';
import path from 'path';
import { setup } from '../e2e/setup/global-setup';

const TEST_DB_PATH = path.join(process.cwd(), '.test-db', 'posman-test.db');

export default async function globalSetup() {
  // Playwright transpiles TypeScript with esbuild, which does not support
  // experimentalDecorators. TypeORM entities crash in this context.
  // The vitest seed step (vitest.config.playwright-seed.ts) runs first via
  // `npm run test:playwright` and seeds the DB using Vite's transpiler which
  // handles experimentalDecorators correctly. Skip re-seeding if the DB exists.
  if (fs.existsSync(TEST_DB_PATH)) return;
  await setup();
}
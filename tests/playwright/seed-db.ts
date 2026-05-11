// Re-exports only `setup` so the DB persists after this vitest global-setup
// run (no teardown means the SQLite file stays in place for Playwright).
export { setup } from '../e2e/setup/global-setup';
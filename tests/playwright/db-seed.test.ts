// Dummy test that only exists to force vitest to run the globalSetup from
// vitest.config.playwright-seed.ts (vitest skips globalSetup with no test files).
import { it } from "vitest";
it("db seeded", () => {});

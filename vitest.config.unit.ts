import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    globals: true,
    setupFiles: ["tests/unit/setup/unit-setup.ts"],
    testTimeout: 5000,
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "unit-test-secret",
    },
  },
});

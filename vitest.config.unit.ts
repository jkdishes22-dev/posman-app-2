import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "@backend": path.resolve(__dirname, "src/backend"),
      "@entities": path.resolve(__dirname, "src/backend/entities"),
      "@services": path.resolve(__dirname, "src/backend/service"),
    },
  },
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

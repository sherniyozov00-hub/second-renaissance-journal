import { defineConfig } from "vitest/config";
import base from "./vitest.config.mts";

// Runs against a migrated and seeded database (DATABASE_URL), as in CI.
export default defineConfig({
  resolve: base.resolve,
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    setupFiles: ["dotenv/config"],
    testTimeout: 20000,
    fileParallelism: false,
    server: base.test?.server,
  },
});

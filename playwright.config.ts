import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests of the main flows (TZ 18, stage 8). They run against a
 * migrated and seeded database with OTP_MOCK_CODE, sandbox payments, inline
 * jobs and the offline AI mock — see the e2e job in .github/workflows/ci.yml.
 *
 *   npm run build && npm run test:e2e        # starts `next start` on :3000
 *   E2E_BASE_URL=http://localhost:3100 npm run test:e2e   # an already running server
 */
const external = process.env.E2E_BASE_URL;
const baseURL = external ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "uz-UZ",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // The sandbox ships its own Chromium; CI installs Playwright's.
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 360, height: 780 } },
      testMatch: /public\.spec\.ts/,
    },
  ],
  webServer: external
    ? undefined
    : {
        command: "npm run start -- -p 3000",
        url: "http://localhost:3000/api/health",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});

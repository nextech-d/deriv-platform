import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
    channel: "chrome",
  },
  webServer: {
    command: "node scripts/dev-e2e.mjs",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_DEMO_MODE: "true",
      SESSION_SECRET: "e2e-test-session-secret-min-32-chars!!",
      ADMIN_SECRET: "e2e-test-admin-secret-min-32-chars!!",
      PARTNER_AGENTS_DATA_PATH: path.join(process.cwd(), "e2e/.data/partners.json"),
      COPY_PROVIDERS_DATA_PATH: path.join(process.cwd(), "e2e/.data/copy-providers.json"),
    },
  },
});

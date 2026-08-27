import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 90_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-1280",
      use: { browserName: "chromium", viewport: { width: 1280, height: 720 } },
    },
    {
      name: "desktop-1920",
      use: { browserName: "chromium", viewport: { width: 1920, height: 1080 } },
    },
  ],
  webServer: {
    command:
      "node node_modules/vinext/dist/cli.js dev --host localhost --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

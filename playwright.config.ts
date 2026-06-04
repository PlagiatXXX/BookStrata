import { defineConfig, devices } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ["list"],
    ["html", { outputFolder: "e2e/reports" }],
  ],
  timeout: 45000,
  expect: {
    timeout: 15000,
  },
  globalSetup: path.resolve("./e2e/global-setup.ts"),
  use: {
    baseURL: "http://localhost:5173",
    storageState: path.resolve("./e2e/.auth/user.json"),
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        locale: "ru-RU",
      },
    },
  ],
});

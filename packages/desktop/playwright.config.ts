import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  workers: 1,
  retries: 0,
  globalSetup: "./e2e/global-setup.ts",
  reporter: process.env.CI ? "github" : "list",
});

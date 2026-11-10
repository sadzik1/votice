import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

// use the test db locally; CI sets the env vars itself
if (existsSync("apps/api/.env")) process.loadEnvFile("apps/api/.env");
const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

// runs against the production build, so build first
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start -w @survey/api",
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: "production",
      PORT: String(PORT),
      COOKIE_SECURE: "false",
      ...(databaseUrl && { DATABASE_URL: databaseUrl }),
    },
  },
});

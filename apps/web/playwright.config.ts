import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT) || 3000;
// Keep host consistent with BETTER_AUTH_URL / cookies (CI uses 127.0.0.1)
const HOST = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${HOST}:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: !process.env.CI,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec next dev --hostname ${HOST} --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? baseURL,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? baseURL,
    },
  },
});

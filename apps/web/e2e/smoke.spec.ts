import { test, expect } from "@playwright/test";

/** Demo-only routes that require AUTH_ADAPTER=none */
const isDemo =
  !process.env.DATABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.AUTH_ADAPTER !== "better-auth" &&
  process.env.AUTH_ADAPTER !== "supabase";

test.describe("CycleWarden smoke", () => {
  test("landing shows product kit messaging", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/cyclewarden/i).first()).toBeVisible();
  });

  test("login page renders forms", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[name="password"]').first()).toBeVisible();
  });

  test("404 page", async ({ page }) => {
    await page.goto("/this-route-does-not-exist-cyclewarden");
    await expect(page.getByText(/404|not found|không tìm thấy/i).first()).toBeVisible();
  });
});

test.describe("Demo mode only", () => {
  test.skip(!isDemo, "Skipped when auth backend is configured");

  test("app shell loads in demo mode", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/demo|session|adapter/i).first()).toBeVisible();
  });

  test("notes example page loads", async ({ page }) => {
    await page.goto("/app/notes");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

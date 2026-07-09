import { test, expect } from "@playwright/test";

test.describe("Shipkit smoke (demo mode)", () => {
  test("landing shows product kit messaging", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/shipkit/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open app|app shell|start building/i }).first()).toBeVisible();
  });

  test("login page renders forms", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.locator('input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[name="password"]').first()).toBeVisible();
  });

  test("app shell loads in demo mode", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: /app/i })).toBeVisible();
    await expect(page.getByText(/demo mode|auth adapter|session/i).first()).toBeVisible();
  });

  test("notes example page loads", async ({ page }) => {
    await page.goto("/app/notes");
    await expect(page.getByRole("heading", { name: /notes/i })).toBeVisible();
  });

  test("404 page", async ({ page }) => {
    await page.goto("/this-route-does-not-exist-shipkit");
    await expect(page.getByText(/404|not found/i).first()).toBeVisible();
  });
});

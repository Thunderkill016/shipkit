import { test, expect } from "@playwright/test";

/**
 * Runs only when portable-pg env is present (CI e2e-portable-pg job).
 * Mốc: Open SaaS / production kits — signup → session → protected app.
 */
const portable =
  Boolean(process.env.DATABASE_URL) &&
  Boolean(process.env.BETTER_AUTH_SECRET) &&
  (process.env.AUTH_ADAPTER === "better-auth" || !process.env.AUTH_ADAPTER);

test.describe("Auth portable-pg", () => {
  test.skip(!portable, "Requires DATABASE_URL + BETTER_AUTH_SECRET");

  test("sign up then see session on /app", async ({ page }) => {
    const email = `e2e_${Date.now()}@shipkit.test`;
    const password = "password12345";

    await page.goto("/login");
    // Second form is sign-up
    const signUpForm = page.locator("form").filter({ hasText: /create account/i });
    await signUpForm.locator('input[name="email"]').fill(email);
    await signUpForm.locator('input[name="password"]').fill(password);
    await signUpForm.getByRole("button", { name: /create account/i }).click();

    await page.waitForURL(/\/app/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /app/i })).toBeVisible();
    // Should not be demo mode when auth works
    await expect(page.getByText(/demo mode/i)).toHaveCount(0);
    await expect(page.getByText(email).or(page.getByText(/better-auth/i))).toBeVisible();
  });
});

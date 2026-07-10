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
    // Last form on page is sign-up (after OAuth + sign-in)
    const signUpForm = page.locator("form").filter({ hasText: /create account|tạo tài khoản/i });
    await signUpForm.locator('input[name="email"]').fill(email);
    await signUpForm.locator('input[name="password"]').fill(password);
    await Promise.all([
      page.waitForURL(/\/app/, { timeout: 45_000 }),
      signUpForm.getByRole("button", { name: /create account|tạo tài khoản/i }).click(),
    ]);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/demo mode|chế độ demo/i)).toHaveCount(0);
    await expect(
      page.getByText(email).or(page.getByText(/better-auth/i)).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});


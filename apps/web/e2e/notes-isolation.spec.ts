import { test, expect } from "@playwright/test";

/**
 * MakerKit-quality isolation: user A must not see user B notes.
 * Requires portable-pg env (DATABASE_URL + BETTER_AUTH_SECRET).
 */
const portable =
  Boolean(process.env.DATABASE_URL) &&
  Boolean(process.env.BETTER_AUTH_SECRET) &&
  (process.env.AUTH_ADAPTER === "better-auth" || !process.env.AUTH_ADAPTER);

async function signUp(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  const signUpForm = page.locator("form").filter({ hasText: /create account|tạo tài khoản/i });
  await signUpForm.locator('input[name="email"]').fill(email);
  await signUpForm.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForURL(/\/app/, { timeout: 45_000 }),
    signUpForm.getByRole("button", { name: /create account|tạo tài khoản/i }).click(),
  ]);
}

test.describe("Notes isolation", () => {
  test.skip(!portable, "Requires portable-pg auth");

  test("user B cannot see user A notes", async ({ browser }) => {
    const password = "password12345";
    const emailA = `iso_a_${Date.now()}@cyclewarden.test`;
    const emailB = `iso_b_${Date.now()}@cyclewarden.test`;
    const secretTitle = `SecretA-${Date.now()}`;

    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await signUp(pageA, emailA, password);
    await pageA.goto("/app/notes");
    await pageA.locator('input[name="title"]').fill(secretTitle);
    await pageA.locator('textarea[name="body"]').fill("private to A");
    await pageA.getByRole("button", { name: /add note|thêm/i }).click();
    await expect(pageA.getByText(secretTitle)).toBeVisible({ timeout: 10_000 });

    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await signUp(pageB, emailB, password);
    await pageB.goto("/app/notes");
    await expect(pageB.getByText(secretTitle)).toHaveCount(0);

    await ctxA.close();
    await ctxB.close();
  });
});

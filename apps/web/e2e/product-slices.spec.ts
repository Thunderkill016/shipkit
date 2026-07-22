import { expect, test } from "@playwright/test";

const demo =
  !process.env.DATABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.AUTH_ADAPTER !== "better-auth" &&
  process.env.AUTH_ADAPTER !== "supabase";

const portable =
  Boolean(process.env.DATABASE_URL) &&
  Boolean(process.env.BETTER_AUTH_SECRET) &&
  (process.env.AUTH_ADAPTER === "better-auth" || !process.env.AUTH_ADAPTER);

async function signUp(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  const form = page.locator("form").filter({ hasText: /create account|tạo tài khoản/i });
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="password"]').fill("password12345");
  await Promise.all([
    page.waitForURL(/\/app/, { timeout: 45_000 }),
    form.getByRole("button", { name: /create account|tạo tài khoản/i }).click(),
  ]);
}

test.describe("Product Slice Engine demo", () => {
  test.skip(!demo, "Requires demo mode");

  test("creates and deletes a config-defined feedback record", async ({ page }) => {
    const summary = `Demo feedback ${Date.now()}`;
    await page.goto("/app/slices/feedback");
    await page.locator('input[name="summary"]').fill(summary);
    await page.locator('textarea[name="details"]').fill("Created from the executable product contract");
    await page.locator('select[name="priority"]').selectOption("high");
    await page.getByRole("button", { name: "Add feedback" }).click();

    const record = page.locator("li").filter({ hasText: summary });
    await expect(record).toBeVisible();
    await record.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(summary)).toHaveCount(0);
  });
});

test.describe("Product Slice Engine portable isolation", () => {
  test.skip(!portable, "Requires portable-pg auth");

  test("user B cannot see user A product records", async ({ browser }) => {
    const secret = `Private feedback ${Date.now()}`;
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signUp(pageA, `slice_a_${Date.now()}@shipkit.test`);
    await pageA.goto("/app/slices/feedback");
    await pageA.locator('input[name="summary"]').fill(secret);
    await pageA.locator('select[name="priority"]').selectOption("medium");
    await pageA.getByRole("button", { name: "Add feedback" }).click();
    await expect(pageA.getByText(secret)).toBeVisible({ timeout: 10_000 });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signUp(pageB, `slice_b_${Date.now()}@shipkit.test`);
    await pageB.goto("/app/slices/feedback");
    await expect(pageB.getByText(secret)).toHaveCount(0);

    await contextA.close();
    await contextB.close();
  });
});

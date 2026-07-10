import { test, expect } from "@playwright/test";

test.describe("i18n", () => {
  test("can switch landing language to EN and VI", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/your idea|foundation/i);

    await page.getByRole("button", { name: "VI", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/ý tưởng|nền tảng/i);
  });

  test("pricing and FAQ sections visible", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(page.locator("#pricing")).toBeVisible();
    await expect(page.locator("#faq")).toBeVisible();
    await expect(page.getByText(/faq|simple pricing/i).first()).toBeVisible();
  });
});

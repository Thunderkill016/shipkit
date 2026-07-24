import { test, expect } from "@playwright/test";

const isDemo =
  !process.env.DATABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.AUTH_ADAPTER !== "better-auth" &&
  process.env.AUTH_ADAPTER !== "supabase";

test.describe("Interactive Evolution Workspace", () => {
  test.skip(!isDemo, "Local operator flow is covered in demo mode");

  test("creates and advances an A2 cycle through a reviewed execution handoff", async ({
    page,
  }) => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const cycleId = `fixture:cycle-${suffix}`;
    const objective = `Choose the next evidence-backed fixture experiment ${suffix}`;

    await page.goto("/app/evolution");
    await page.getByLabel("Objective").fill(objective);
    await page.getByLabel(/Cycle ID/).fill(cycleId);
    await page.getByRole("button", { name: "Create durable cycle" }).click();

    await expect(page.getByRole("heading", { name: objective })).toBeVisible();
    await expect(page.getByText("stage: created")).toBeVisible();

    await page.getByRole("button", { name: "Inspect configured repository" }).click();
    await expect(page.getByText("stage: observed")).toBeVisible();

    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Assess repository readiness" }).click();
    await expect(page.getByText("stage: modeled")).toBeVisible({ timeout: 60_000 });

    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Research and prepare handoff" }).click();
    await expect(page.getByText("stage: planned")).toBeVisible({ timeout: 60_000 });

    await expect(page.getByText("Execution handoff ready")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Selected decision" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Execution handoff" })).toBeVisible();
  });
});

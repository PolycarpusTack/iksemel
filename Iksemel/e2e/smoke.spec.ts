import { test, expect } from "@playwright/test";

test("app loads and shows header", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("text=XML Filter & Export Builder")).toBeVisible();
});

test("app shows placeholder content", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("text=Foundation ready")).toBeVisible();
});

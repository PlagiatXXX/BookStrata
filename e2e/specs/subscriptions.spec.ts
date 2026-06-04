import { test, expect } from "@playwright/test";
import { ROUTES } from "../fixtures/test-data";

test.describe("7. Подписки и лимиты", () => {
  test("7.1 Статус подписки", async ({ page }) => {
    await page.goto(ROUTES.pricing);
    await page.waitForURL(/\/pricing/, { timeout: 10000 });

    await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
  });
});

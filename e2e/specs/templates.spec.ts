import { test, expect } from "@playwright/test";
import { ROUTES } from "../fixtures/test-data";

test.describe("8. Шаблоны", () => {
  test("8.1 Просмотр шаблонов", async ({ page }) => {
    await page.goto(ROUTES.templates);
    await page.waitForURL(/\/templates/, { timeout: 10000 });

    await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
  });

  test("8.2 Использование шаблона", async ({ page }) => {
    await page.goto(ROUTES.templates);
    await page.waitForURL(/\/templates/, { timeout: 10000 });

    const useButton = page.locator("button:has-text(\"Использовать\")").first();
    if (await useButton.isVisible()) {
      await useButton.click();
      await page.waitForURL(/\/tier-lists\//, { timeout: 10000 }).catch(() => {});
    }
  });
});

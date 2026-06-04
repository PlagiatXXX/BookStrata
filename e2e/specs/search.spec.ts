import { test, expect } from "@playwright/test";

test.describe("9. Поиск и навигация", () => {
  test("9.1 Главная страница загружается", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
  });
});

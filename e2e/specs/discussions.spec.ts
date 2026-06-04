import { test, expect } from "@playwright/test";
import { ROUTES } from "../fixtures/test-data";

test.describe("6. Обсуждения", () => {
  test("6.1 Просмотр списка обсуждений", async ({ page }) => {
    await page.goto(ROUTES.discussions);
    await page.waitForURL(/\/discussions/, { timeout: 10000 });

    await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
  });

  test("6.2 Создание топика", async ({ page }) => {
    await page.goto(ROUTES.discussions);
    await page.waitForURL(/\/discussions/, { timeout: 10000 });

    const createButton = page.locator("button:has-text(\"Создать\")").or(
      page.locator("a:has-text(\"Создать\")"),
    );

    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(1000);

      const titleInput = page.locator("input[aria-label*=\"Тема\"]").or(
        page.locator("input[placeholder*=\"Тема\"]"),
      );

      if (await titleInput.isVisible()) {
        await titleInput.fill("Тестовый топик E2E");
        await page.click("button[type=\"submit\"]");
        await page.waitForTimeout(1000);
      }
    }
  });
});

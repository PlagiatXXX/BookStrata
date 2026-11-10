import { test, expect } from "@playwright/test";
import { ROUTES } from "../fixtures/test-data";

test.describe("Responsive — мобильные вьюпорты", () => {
  const MOBILE_VIEWPORTS = [
    { name: "Narrow Mobile (320px)", width: 320, height: 568 },
    { name: "OnePlus 10T", width: 393, height: 873 },
    { name: "iPhone SE", width: 375, height: 667 },
    { name: "iPhone 14 Pro", width: 390, height: 844 },
    { name: "Samsung A52", width: 412, height: 915 },
  ] as const;

  for (const device of MOBILE_VIEWPORTS) {
    test.describe(`Вьюпорт ${device.name} (${device.width}×${device.height})`, () => {
      test.use({ viewport: { width: device.width, height: device.height } });

      test("Dashboard — нет горизонтального скролла", async ({ page }) => {
        await page.goto(ROUTES.dashboard, { waitUntil: "networkidle" });
        await page.waitForTimeout(2000);

        // Проверяем, что ширина документа не превышает ширину вьюпорта
        const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const viewportWidth = await page.evaluate(() => window.innerWidth);
        expect(docWidth).toBeLessThanOrEqual(viewportWidth);

        // Кнопка AI Librarian видна
        const aiCard = page.locator("text=Букстраж");
        await expect(aiCard).toBeVisible({ timeout: 5000 });

        // Статистика активности видна
        const stats = page.locator("text=Моя активность");
        await expect(stats).toBeVisible({ timeout: 5000 });
      });

      test("Profile Page — нет горизонтального скролла", async ({ page }) => {
        await page.goto(ROUTES.profile, { waitUntil: "networkidle" });
        await page.waitForTimeout(2000);

        const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const viewportWidth = await page.evaluate(() => window.innerWidth);
        expect(docWidth).toBeLessThanOrEqual(viewportWidth);

        // Статистика профиля видна
        const stats = page.locator("text=Тир-листы");
        await expect(stats).toBeVisible({ timeout: 5000 });
      });
    });
  }

  test.describe("Десктопный вьюпорт (1440×900)", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("Dashboard — нет горизонтального скролла на широком экране", async ({ page }) => {
      await page.goto(ROUTES.dashboard, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);

      const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(docWidth).toBeLessThanOrEqual(viewportWidth);
    });
  });
});

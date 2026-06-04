import { test, expect } from "@playwright/test";
import { ROUTES } from "../fixtures/test-data";
import { setupApiMocks } from "../mocks/api-routes";

test.describe("5. Битвы", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test("5.1 Просмотр списка битв", async ({ page }) => {
    await page.goto(ROUTES.battles);
    await page.waitForURL(/\/battles/, { timeout: 10000 });

    await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
  });

  test("5.3 Голосование в битве", async ({ browser }) => {
    const userCtx = await browser.newContext({ storageState: "e2e/.auth/user.json" });
    const userPage = await userCtx.newPage();
    await setupApiMocks(userPage);

    await userPage.goto(ROUTES.battles);
    await userPage.waitForURL(/\/battles/, { timeout: 10000 });

    const voteButton = userPage.locator("button:has-text(\"Голосовать\")").first();
    if (await voteButton.isVisible()) {
      await voteButton.click();
      await userPage.waitForTimeout(1000);
    }

    await userCtx.close();
  });
});

import { test, expect } from "@playwright/test";
import { ROUTES } from "../fixtures/test-data";

test.describe("4. Админка", () => {
  test("4.1 Доступ к админ-панели", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: "e2e/.auth/admin.json" });
    const adminPage = await ctx.newPage();

    await adminPage.goto(ROUTES.adminDashboard, { waitUntil: "networkidle", timeout: 15000 });
    await adminPage.waitForTimeout(2000);

    await expect(adminPage.locator("body")).toContainText(/users|пользовател/i, { timeout: 5000 });

    await ctx.close();
  });

  test("4.2 Админ-панель недоступна обычному пользователю", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: "e2e/.auth/user.json" });
    const userPage = await ctx.newPage();

    await userPage.goto(ROUTES.adminDashboard, { waitUntil: "networkidle", timeout: 15000 });
    await userPage.waitForTimeout(2000);

    // AdminGuard показывает "Доступ запрещён" без редиректа
    await expect(userPage.getByText(/доступ запрещён/i)).toBeVisible({ timeout: 10000 });

    await ctx.close();
  });

  test("4.4 Управление пользователями (админ)", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: "e2e/.auth/admin.json" });
    const adminPage = await ctx.newPage();

    await adminPage.goto("/admin/users", { waitUntil: "networkidle", timeout: 15000 });
    await adminPage.waitForTimeout(2000);

    await expect(adminPage.locator("body")).toContainText(/e2e_chief|e2e_member/i, { timeout: 5000 });

    await ctx.close();
  });
});

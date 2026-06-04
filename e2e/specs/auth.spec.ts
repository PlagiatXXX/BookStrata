import { test, expect } from "@playwright/test";
import { ROUTES, USERS } from "../fixtures/test-data";
import { setupApiMocks } from "../mocks/api-routes";

const NEW_USER = {
  username: "e2e_newbie_" + Date.now(),
  email: `e2e_newbie_${Date.now()}@test.com`,
  password: "NewPass123!",
};

// Тесты, которые должны быть неавторизованы
test.describe("1. Регистрация и вход (unauth)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test("1.1 Регистрация нового пользователя", async ({ page }) => {
    await page.goto(ROUTES.register, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    await page.fill("input[name=\"username\"]", NEW_USER.username);
    await page.fill("input[name=\"email\"]", NEW_USER.email);
    await page.fill("input[name=\"password\"]", NEW_USER.password);
    await page.check("input[type=\"checkbox\"]");

    await page.click("button[type=\"submit\"]");

    await expect(page.getByText(/подтвердите|проверьте|отправлено/i)).toBeVisible({ timeout: 10000 });
  });

  test("1.2 Вход с существующим аккаунтом (через форму)", async ({ page }) => {
    await page.goto(ROUTES.login, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    await page.fill("input[name=\"username\"]", USERS.user.username);
    await page.fill("input[name=\"password\"]", USERS.user.password);
    await page.click("button[type=\"submit\"]");

    await page.waitForURL("**/dashboard", { timeout: 10000 });
    await expect(page.locator("body")).toContainText(USERS.user.username);
  });

  test("1.3 Неверные креды при входе", async ({ page }) => {
    await page.goto(ROUTES.login, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    await page.fill("input[name=\"username\"]", USERS.user.username);
    await page.fill("input[name=\"password\"]", "wrong_password_123");
    await page.click("button[type=\"submit\"]");

    await expect(page.locator(".text-red-600")).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test("1.5 Зарезервированный username", async ({ page }) => {
    await page.goto(ROUTES.register, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    await page.fill("input[name=\"username\"]", "admin");
    await page.fill("input[name=\"email\"]", "admin_reserved@test.com");
    await page.fill("input[name=\"password\"]", "StrongPass1!");
    await page.check("input[type=\"checkbox\"]");

    await page.click("button[type=\"submit\"]");

    await expect(page.locator(".text-red-600")).toBeVisible({ timeout: 5000 });
  });

  test("1.6 Восстановление пароля", async ({ page }) => {
    // Мокаем forgot-password напрямую в тесте
    await page.route("**/api/auth/forgot-password*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Инструкции отправлены на почту" }),
      });
    });

    await page.goto(ROUTES.forgotPassword, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    await page.fill("#email", USERS.user.email);
    await page.click("button[type=\"submit\"]");

    await expect(page.getByText(/отправлено/i)).toBeVisible({ timeout: 10000 });
  });
});

// Тесты, которые используют авторизованное состояние
test.describe("1. Регистрация и вход (auth)", () => {
  test("1.4 Выход (logout)", async ({ page }) => {
    await page.goto(ROUTES.dashboard, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const logoutBtn = page.locator("button[aria-label=\"Выйти\"]");
    await expect(logoutBtn).toBeVisible({ timeout: 5000 });
    await logoutBtn.click();

    // Кнопка подтверждения внутри модального диалога (а не триггер в хедере)
    const confirmBtn = page.locator("div[role=\"dialog\"] button:has-text(\"Выйти\")");
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain("/dashboard");
  });
});

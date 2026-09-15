import { test, expect } from "@playwright/test";
import { ROUTES, USERS } from "../fixtures/test-data";
import { setupApiMocks } from "../mocks/api-routes";
import { loginViaApi, getRefreshTokenCookie } from "../helpers/auth";

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
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });

    await page.fill('input[name="username"]', NEW_USER.username);
    await page.fill('input[name="email"]', NEW_USER.email);
    await page.fill('input[name="password"]', NEW_USER.password);
    await page.check('input[type="checkbox"]');

    await page.click('button[type="submit"]');

    // После успешной регистрации — видим сообщение о подтверждении email
    await expect(
      page.getByText(/подтвердите|проверьте|отправлено/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("1.2 Вход с существующим аккаунтом (через форму)", async ({ page }) => {
    await page.goto(ROUTES.login, { waitUntil: "networkidle" });
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });

    await page.fill('input[name="username"]', USERS.user.username);
    await page.fill('input[name="password"]', USERS.user.password);
    await page.click('button[type="submit"]');

    await page.waitForURL("**/dashboard", { timeout: 10000 });
    // Проверяем что на странице есть username — подтверждает успешный логин
    await expect(page.locator("body")).toContainText(USERS.user.username, { timeout: 5000 });
  });

  test("1.3 Неверные креды при входе", async ({ page }) => {
    await page.goto(ROUTES.login, { waitUntil: "networkidle" });
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });

    await page.fill('input[name="username"]', USERS.user.username);
    await page.fill('input[name="password"]', "wrong_password_123");
    await page.click('button[type="submit"]');

    // Должна появиться ошибка (текст о неверных данных)
    await expect(
      page.getByText(/неверн|неправиль|ошибка|incorrect/i)
    ).toBeVisible({ timeout: 5000 });
    // Не ушли с страницы авторизации
    expect(page.url()).toContain("/auth");
  });

  test("1.5 Зарезервированный username", async ({ page }) => {
    await page.goto(ROUTES.register, { waitUntil: "networkidle" });
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });

    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="email"]', "admin_reserved@test.com");
    await page.fill('input[name="password"]', "StrongPass1!");
    await page.check('input[type="checkbox"]');

    await page.click('button[type="submit"]');

    // Должна появиться ошибка о зарезервированном username
    await expect(
      page.getByText(/зарезервирован|занят|недопустим|ошибка/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("1.6 Восстановление пароля — реальный запрос", async ({ page }) => {
    await page.goto(ROUTES.forgotPassword, { waitUntil: "networkidle" });
    await page.waitForSelector("#email", { timeout: 10000 });

    await page.fill("#email", USERS.user.email);
    await page.click('button[type="submit"]');

    // Бэкенд вернёт 200 (даже если email не найден — safety).
    // Важно: НЕ должно быть критической ошибки (500, network error).
    // Проверяем что появился любой ответ — успех или сообщение об ошибке.
    await expect(
      page.getByText(/отправлено|запрос|проверьте|спам|ошибка/i)
    ).toBeVisible({ timeout: 15000 });
  });
});

// Тесты, которые используют авторизованное состояние
test.describe("1. Регистрация и вход (auth)", () => {
  test("1.4 Выход (logout) — сессия очищается", async ({ page }) => {
    await page.goto(ROUTES.dashboard, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Проверяем что залогинены
    await expect(page.locator("body")).toContainText(USERS.user.username, { timeout: 5000 });

    const logoutBtn = page.locator('button[aria-label="Выйти"]').first();
    await expect(logoutBtn).toBeVisible({ timeout: 5000 });
    await logoutBtn.click();

    // Кнопка подтверждения внутри модального диалога
    const confirmBtn = page.locator('div[role="dialog"] button:has-text("Выйти")');
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Ждём завершения выхода
    await page.waitForFunction(() => !window.location.pathname.includes("/dashboard"), { timeout: 10000 });

    // После logout — не на dashboard
    expect(page.url()).not.toContain("/dashboard");
  });
});

// Тесты на cookies
test.describe("1. Cookies", () => {
  test("1.7 Refresh token cookie устанавливается при логине", async ({ page, context }) => {
    await page.goto(ROUTES.login, { waitUntil: "networkidle" });
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });

    await page.fill('input[name="username"]', USERS.user.username);
    await page.fill('input[name="password"]', USERS.user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Refresh token cookie должен быть установлен
    const refreshToken = await getRefreshTokenCookie(context);
    expect(refreshToken).toBeTruthy();
    expect(refreshToken!.length).toBeGreaterThan(10);
  });

  test("1.8 Refresh token cookie удаляется при logout", async ({ page, context }) => {
    // Логинимся через API чтобы установить cookie
    await loginViaApi(USERS.user);
    await page.goto(ROUTES.dashboard, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Cookie установлен
    const beforeLogout = await getRefreshTokenCookie(context);
    expect(beforeLogout).toBeTruthy();

    // Выходим
    const logoutBtn = page.locator('button[aria-label="Выйти"]').first();
    await logoutBtn.click();
    const confirmBtn = page.locator('div[role="dialog"] button:has-text("Выйти")');
    await confirmBtn.click();
    await page.waitForFunction(() => !window.location.pathname.includes("/dashboard"), { timeout: 10000 });

    // Cookie удалён
    const afterLogout = await getRefreshTokenCookie(context);
    expect(afterLogout).toBeUndefined();
  });
});

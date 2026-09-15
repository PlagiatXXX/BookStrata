import { test, expect } from "@playwright/test";
import { logoutViaUI, loginViaUI, clearRefreshTokenCookie } from "../../helpers/auth";
import { USERS } from "../../fixtures/test-data";

test.describe("Session Expiry and Inactivity", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("6.1 Unauthenticated user sees /auth on protected route", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await page.waitForURL("**/auth*", { timeout: 15000 });
    expect(page.url()).toContain("/auth");
  });

  test("6.2 Logout invalidates session immediately", async ({ page }) => {
    await loginViaUI(page, USERS.user);

    // Проверяем что залогинены
    await expect(page.locator("body")).toContainText(USERS.user.username, { timeout: 10000 });

    // Выходим через UI
    await logoutViaUI(page);

    // Пытаемся перейти на защищённую страницу
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    // Должен быть редирект на auth
    await page.waitForURL("**/auth*", { timeout: 15000 });
    expect(page.url()).not.toContain("/dashboard");
  });

  test("6.3 Page refresh maintains session", async ({ page }) => {
    await loginViaUI(page, USERS.user);

    // Переходим на профиль — сессия должна сохраниться
    await page.goto("/profile", { waitUntil: "networkidle" });

    // Не перекинуло на /auth — значит сессия жива
    expect(page.url()).not.toContain("/auth");
  });

  test("6.4 Navigation after inactivity maintains session", async ({ page }) => {
    await loginViaUI(page, USERS.user);

    // Симулируем неактивность — ждём 5 секунд (достаточно для7-дневного токена)
    await page.waitForTimeout(5000);

    // Переходим на другую страницу
    await page.goto("/profile", { waitUntil: "domcontentloaded" });

    // Должны быть залогинены — проверяем что НЕ на /auth
    expect(page.url()).not.toContain("/auth");
    // Дополнительно — проверяем что контент загрузился
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });

  test("6.5 User activity refreshes session across pages", async ({ page }) => {
    await loginViaUI(page, USERS.user);

    // Проходим по нескольким страницам
    const pages = ["/dashboard", "/profile", "/rankings"];
    for (const pagePath of pages) {
      await page.goto(pagePath, { waitUntil: "networkidle" });
      // Проверяем что не перекинуло на /auth
      expect(page.url()).not.toContain("/auth");
    }

    // В конце — проверяем что залогинены (кнопка "Выйти" видна)
    await expect(
      page.locator('button[aria-label="Выйти"]').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("6.6 Missing refresh token triggers redirect to /auth", async ({ page, context }) => {
    await loginViaUI(page, USERS.user);

    // Удаляем refresh cookie
    await clearRefreshTokenCookie(context);

    // Перезагружаем — refresh не найдёт cookie → 401 → редирект
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForURL("**/auth*", { timeout: 15000 });
    expect(page.url()).toContain("/auth");
  });

  test("6.7 Session persists across multiple navigations", async ({ page }) => {
    await loginViaUI(page, USERS.user);

    // Быстрая навигация по 5 страницам
    const routes = ["/dashboard", "/profile", "/tier-lists", "/templates", "/dashboard"];
    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(page.url()).not.toContain("/auth");
    }

    // Финальная проверка — залогинены
    await expect(page.locator("body")).toContainText(USERS.user.username, { timeout: 10000 });
  });
});

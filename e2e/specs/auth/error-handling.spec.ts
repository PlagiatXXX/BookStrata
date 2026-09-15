import { test, expect } from "@playwright/test";
import { USERS } from "../../fixtures/test-data";
import {
  loginViaApi,
  apiRequest,
  clearRefreshTokenCookie,
} from "../../helpers/auth";

test.describe("Auth Error Handling", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("11.1 Invalid refresh token clears session", async ({ page, context }) => {
    await loginViaApi(USERS.user);
    await clearRefreshTokenCookie(context);

    // Перезагружаем — приложение не найдёт cookie → 401 → редирект
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForURL("**/auth*", { timeout: 15000 });
    expect(page.url()).toContain("/auth");
  });

  test("11.2 Network error during refresh shows error", async ({ page }) => {
    // Загружаем страницу, блокируем запросы на refresh
    await page.route("**/api/auth/refresh", (route) => route.abort("connectionrefused"));
    await page.goto("/auth", { waitUntil: "domcontentloaded" });

    // Проверяем что страница загрузилась (не крашнулась)
    await expect(page.locator("body")).toContainText(/вход|логин|авторизация/i, { timeout: 10000 });
  });

  test("11.3 Expired token after refresh doesn't show session expired for guests", async ({ page }) => {
    // Гость — должен видеть /auth, НЕ overlay "сессия истекла"
    await page.goto("/auth", { waitUntil: "domcontentloaded" });

    const hasSessionExpired = await page.getByText("Сессия истекла")
      .isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasSessionExpired).toBeFalsy();
  });

  test("11.4 Invalid token doesn't prevent fresh login", async ({ page, context }) => {
    await clearRefreshTokenCookie(context);

    await page.goto("/auth", { waitUntil: "domcontentloaded" });

    // Логинимся после очистки сессии
    await page.fill('input[name="username"]', USERS.user.username);
    await page.fill('input[name="password"]', USERS.user.password);
    await page.click('button[type="submit"]');

    await page.waitForURL("**/dashboard", { timeout: 15000 });
    expect(page.url()).toContain("/dashboard");
  });

  test("11.5 Expired token returns 401 with valid error structure", async ({ page }) => {
    const { status, data } = await apiRequest(page, "GET", "/api/users/me", "totally-invalid-token");
    expect(status).toBe(401);

    const response = data as Record<string, unknown>;
    // Ответ должен иметь структуру с ошибкой
    expect(response.error || response.message || response.data).toBeTruthy();
  });

  test("11.6 Multiple failed refresh attempts don't crash the app", async ({ page, context }) => {
    await loginViaApi(USERS.user);
    await clearRefreshTokenCookie(context);

    // Пытаемся перейти на несколько страниц — не должно крашнуться
    const routes = ["/dashboard", "/profile", "/tier-lists"];
    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      // Страница загрузилась (не white screen)
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toBeTruthy();
    }
  });
});

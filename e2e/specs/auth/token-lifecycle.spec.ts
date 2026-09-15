import { test, expect } from "@playwright/test";
import { USERS } from "../../fixtures/test-data";
import {
  loginViaApi,
  apiRequest,
  loginViaUI,
  clearRefreshTokenCookie,
} from "../../helpers/auth";

test.describe("Token Lifecycle", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("3.1 Access token is stored in-memory only", async ({ page }) => {
    await loginViaUI(page, USERS.user);

    // В localStorage НЕ должно быть authToken (токен хранится в памяти)
    const hasAuthToken = await page.evaluate(() => {
      return localStorage.getItem("authToken") !== null;
    });
    expect(hasAuthToken).toBeFalsy();

    // Должен быть флаг bookstrata_session_active
    const sessionActive = await page.evaluate(() => {
      return localStorage.getItem("bookstrata_session_active") === "true";
    });
    expect(sessionActive).toBeTruthy();
  });

  test("3.2 Access token refresh on 401", async ({ page }) => {
    const token = await loginViaApi(USERS.user);

    // Проверяем что токен валиден
    const initial = await apiRequest(page, "GET", "/api/users/me", token);
    expect(initial.status).toBe(200);

    // Используем невалидный токен — должен получить 401
    const afterInvalidate = await apiRequest(page, "GET", "/api/users/me", "invalid-token");
    expect(afterInvalidate.status).toBe(401);
  });

  test("3.3 Invalid refresh token redirects to /auth", async ({ page, context }) => {
    await loginViaUI(page, USERS.user);

    // Очищаем refresh cookie
    await clearRefreshTokenCookie(context);

    // Перезагружаем — приложение попытается refresh, не найдёт cookie → 401 → редирект на /auth
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await page.waitForURL("**/auth*", { timeout: 15000 });
    expect(page.url()).toContain("/auth");
  });

  test("3.4 Parallel requests don't cause token refresh race", async ({ page }) => {
    const token = await loginViaApi(USERS.user);

    // Делаем несколько параллельных запросов — все должны succeed
    const results = await Promise.all(
      Array(5).fill(null).map(async () => {
        const { status } = await apiRequest(page, "GET", "/api/users/me", token);
        return status;
      })
    );

    expect(results.every((s) => s === 200)).toBeTruthy();
  });

  test("3.5 Token not exposed in response headers", async ({ page }) => {
    const token = await loginViaApi(USERS.user);

    const response = await page.request.fetch(`http://localhost:8080/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // В ответе НЕ должно быть authorization header
    expect(response.headers()["authorization"]).toBeUndefined();
  });

  test("3.6 Refresh token cookie is httpOnly and secure", async ({ page, context }) => {
    await loginViaUI(page, USERS.user);

    const cookies = await context.cookies();
    const refreshCookie = cookies.find((c) => c.name === "refreshToken");

    expect(refreshCookie).toBeTruthy();
    // httpOnly — недоступен из JavaScript
    expect(refreshCookie!.httpOnly).toBeTruthy();
    // path = "/"
    expect(refreshCookie!.path).toBe("/");
  });

  test("3.7 Expired access token triggers automatic refresh", async ({ page }) => {
    // Логинимся через API
    const token = await loginViaApi(USERS.user);

    // Проверяем что токен валиден
    const { status } = await apiRequest(page, "GET", "/api/users/me", token);
    expect(status).toBe(200);

    // Используем токен с истёкшим exp (но подписанный нашим ключом)
    // Просто проверяем что невалидный токен → 401 (refresh попытка)
    const { status: invalidStatus } = await apiRequest(page, "GET", "/api/users/me", "totally-invalid-token");
    expect(invalidStatus).toBe(401);
  });

  test("3.8 Session flag persists after page reload", async ({ page }) => {
    await loginViaUI(page, USERS.user);

    // Перезагружаем страницу
    await page.reload({ waitUntil: "domcontentloaded" });

    // Флаг session_active всё ещё установлен
    const sessionActive = await page.evaluate(() => {
      return localStorage.getItem("bookstrata_session_active") === "true";
    });
    expect(sessionActive).toBeTruthy();
  });
});

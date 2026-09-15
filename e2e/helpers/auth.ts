import { expect } from "@playwright/test";
import type { Page, BrowserContext } from "@playwright/test";

const API_BASE = "http://localhost:8080";

/**
 * Login via UI (form submission).
 * Ждёт редиректа на /dashboard — если логин не удался, тест упадёт по таймауту.
 */
export async function loginViaUI(page: Page, user: { username: string; password: string }): Promise<void> {
  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[name="username"]', { timeout: 15000 });

  await page.fill('input[name="username"]', user.username);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');

  // Ждём редирект на dashboard — подтверждает успешный логин
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  // Даём время приложению установить in-memory токен и cookie
  await page.waitForTimeout(500);
}

/**
 * Logout via UI: кнопка "Выйти" (Desktop) → подтверждение в модалке.
 * Использует .first() потому что на странице 2 кнопки (mobile + desktop).
 */
export async function logoutViaUI(page: Page): Promise<void> {
  const logoutBtn = page.locator('button[aria-label="Выйти"]').first();
  await logoutBtn.click({ timeout: 5000 });

  // Подтверждение в модальном диалоге
  const confirmBtn = page.locator('div[role="dialog"] button:has-text("Выйти")');
  await confirmBtn.click({ timeout: 5000 });

  // Ждём завершения выхода — URL не должен содержать /dashboard
  await page.waitForFunction(() => !window.location.pathname.includes("/dashboard"), { timeout: 10000 });
}

/**
 * Дождаться появления overlay «Сессия истекла».
 */
export async function waitForSessionExpired(page: Page, timeout = 15000): Promise<void> {
  await page.locator("text=Сессия истекла").first().waitFor({ timeout });
}

/**
 * Очистить cookies из контекста.
 * Использовать когда тесту нужен анонимный доступ.
 */
export async function clearAuthState(context: BrowserContext): Promise<void> {
  await context.clearCookies();
}

/**
 * Получить значение refresh token cookie.
 */
export async function getRefreshTokenCookie(context: BrowserContext): Promise<string | undefined> {
  const cookies = await context.cookies();
  return cookies.find((c) => c.name === "refreshToken")?.value;
}

/**
 * Удалить refresh token cookie.
 */
export async function clearRefreshTokenCookie(context: BrowserContext): Promise<void> {
  await context.clearCookies({ name: "refreshToken" });
}

/**
 * Залогиниться через API напрямую и получить access token.
 * Бросает ошибку если логин не удался или формат ответа изменился.
 */
export async function loginViaApi(user: { username: string; password: string }): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user.username, password: user.password }),
  });

  if (!res.ok) {
    throw new Error(`Login failed for ${user.username}: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const token = json.data?.accessToken ?? json.accessToken;
  if (typeof token !== "string" || !token) {
    throw new Error(`Login response missing accessToken for ${user.username}. Keys: ${Object.keys(json)}`);
  }
  return token;
}

/**
 * Выполнить API-запрос с авторизацией через Playwright request API.
 * Работает без браузерного контекста — прямой HTTP с Bearer token.
 */
export async function apiRequest(
  page: Page,
  method: string,
  path: string,
  token?: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const reqHeaders: Record<string, string> = {
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
  };
  if (token) reqHeaders["Authorization"] = `Bearer ${token}`;

  const response = await page.request.fetch(`${API_BASE}${path}`, {
    method: method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    headers: reqHeaders,
    data: body ? JSON.stringify(body) : undefined,
  });

  const json = await response.json().catch(() => null);
  return { status: response.status(), data: json };
}

/**
 * Выполнить API-запрос из браузерного контекста (только с cookies, без Authorization header).
 * Подходит для анонимных запросов или запросов где достаточно refreshToken cookie.
 * ВАЖНО: страница должна быть загружена (иначе page.evaluate не работает).
 */
export async function apiCallFromBrowser(
  page: Page,
  path: string,
  options?: { method?: string; body?: unknown; headers?: Record<string, string> },
): Promise<{ status: number; data: unknown }> {
  return page.evaluate(async ({ path, method, body, extraHeaders }) => {
    const res = await fetch(path, {
      method: method || "GET",
      credentials: "include",
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...extraHeaders,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, data: json };
  }, { path, method: options?.method, body: options?.body, extraHeaders: options?.headers });
}

/**
 * Дождаться стабилизации URL (нет навигации в течение 500мс).
 * Заменяет waitForTimeout — ждёт реального завершения навигации.
 */
export async function waitForStableUrl(page: Page, timeout = 10000): Promise<string> {
  await page.waitForFunction(() => {
    return document.readyState === "complete";
  }, { timeout });
  // Даём 500мс на завершение редиректов
  await page.waitForTimeout(500);
  return page.url();
}

/**
 * Проверить что пользователь залогинен (есть username на странице).
 */
export async function expectLoggedIn(page: Page, username: string, timeout = 10000): Promise<void> {
  await expect(page.locator("body")).toContainText(username, { timeout });
}

/**
 * Проверить что пользователь НЕ залогинен (URL содержит /auth).
 */
export async function expectNotLoggedIn(page: Page): Promise<void> {
  expect(page.url()).toMatch(/\/auth/);
}

import { test, expect } from "@playwright/test";
import { clearAuthState, loginViaUI } from "../../helpers/auth";
import { USERS } from "../../fixtures/test-data";

test.describe("Anonymous User Access", () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test("4.1 Anonymous gets 401 on protected endpoints", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const response = await page.evaluate(async () => {
      const res = await fetch("/api/users/me", { credentials: "include" });
      return res.status;
    });
    expect(response).toBe(401);
  });

  test("4.2 Anonymous can view public pages", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const hasContent = await page.locator("body").textContent();
    expect(hasContent).toBeTruthy();
  });

  test("4.3 Anonymous clicking 'My Version' redirects to login", async ({ page }) => {
    await loginViaUI(page, USERS.user);

    await page.goto("/tier-lists", { waitUntil: "domcontentloaded" });

    const tierListLink = page.locator("a[href*='/tier-lists/']").first();
    if (await tierListLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tierListLink.click();
      await page.waitForLoadState("domcontentloaded");

      await clearAuthState(page.context());
      await page.reload({ waitUntil: "domcontentloaded" });

      const forkBtn = page.getByText("Своя версия").first();
      if (await forkBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await forkBtn.click();
        await page.waitForURL("**/auth*", { timeout: 10000 });
        expect(page.url()).toContain("/auth");
      }
    }
  });

  test("4.4 Anonymous cannot access dashboard", async ({ page }) => {
    // Приложение показывает форму логина на защищённых страницах для анонимных пользователей
    // (не делает редирект на /auth, а рендерит AuthForm прямо на странице)
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    // Проверяем что пользователь не авторизован — есть форма логина
    await expect(
      page.getByRole("heading", { name: /добро пожаловать/i })
    ).toBeVisible({ timeout: 15000 });
  });

  test("4.5 Anonymous cannot access profile", async ({ page }) => {
    // Приложение показывает форму логина на защищённых страницах для анонимных пользователей
    await page.goto("/profile", { waitUntil: "networkidle" });

    await expect(
      page.getByRole("heading", { name: /добро пожаловать/i })
    ).toBeVisible({ timeout: 15000 });
  });

  test("4.6 Anonymous cannot create tier list", async ({ page }) => {
    // Сначала загружаем страницу (page.evaluate требует загруженную страницу)
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Попытка создать тир-лист через API без авторизации
    const response = await page.evaluate(async () => {
      const res = await fetch("/api/tier-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: "Anonymous Tier List" }),
      });
      return res.status;
    });

    // Должен получить 401
    expect(response).toBe(401);
  });
});

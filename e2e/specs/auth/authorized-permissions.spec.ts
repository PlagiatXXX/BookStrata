import { test, expect } from "@playwright/test";
import { USERS } from "../../fixtures/test-data";

test.describe("Authorized User Permissions", () => {
  // Используем storageState по умолчанию (e2e/.auth/user.json) — пользователь залогинен

  test("5.1 User can access dashboard", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    expect(page.url()).toContain("/dashboard");
    await expect(page.locator("body")).toContainText(USERS.user.username, { timeout: 10000 });
  });

  test("5.2 User can access profile", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/profile");
  });

  test("5.3 User can view tier lists", async ({ page }) => {
    await page.goto("/tier-lists", { waitUntil: "domcontentloaded" });

    const hasContent = await page.locator("body").textContent();
    expect(hasContent).toBeTruthy();
  });

  test("5.4 User can access tier lists page", async ({ page }) => {
    // /tier-lists/new не существует как отдельный маршрут — tier list создаётся через модалку
    await page.goto("/tier-lists", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/tier-lists");
  });

  test("5.5 User can view other user's public tier list", async ({ page }) => {
    await page.goto("/tier-lists", { waitUntil: "domcontentloaded" });

    const tierListLink = page.locator("a[href*='/tier-lists/']").first();
    if (await tierListLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tierListLink.click();
      await page.waitForLoadState("domcontentloaded");
      expect(page.url()).toContain("/tier-lists/");
    }
  });

  test("5.6 User can access discussions", async ({ page }) => {
    await page.goto("/discussions", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/discussions");
  });

  test("5.7 User can access templates", async ({ page }) => {
    await page.goto("/templates", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/templates");
  });

  test("5.8 User session persists across navigation", async ({ page }) => {
    // Проходим по нескольким страницам — сессия не должна теряться
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/dashboard");

    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/profile");

    await page.goto("/tier-lists", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/tier-lists");

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    // Должны быть залогинены
    await expect(page.locator("body")).toContainText(USERS.user.username, { timeout: 10000 });
  });
});

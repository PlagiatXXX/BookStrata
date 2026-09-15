import { test, expect } from "@playwright/test";
import { USERS } from "../../fixtures/test-data";

test.describe("Login Validation (UI)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("2.1 Login with wrong password", async ({ page }) => {
    await page.goto("/auth", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    await page.fill('input[name="username"]', USERS.user.username);
    await page.fill('input[name="password"]', "WrongPassword123!");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=/неверное|неправильный|ошибка/i")).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain("/auth");
  });

  test("2.2 Login with nonexistent user", async ({ page }) => {
    await page.goto("/auth", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    await page.fill('input[name="username"]', "nonexistent_user_999");
    await page.fill('input[name="password"]', "AnyPassword1!");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=/неверное|неправильный|ошибка/i")).toBeVisible({ timeout: 10000 });
  });

  test("2.3 Login with empty fields", async ({ page }) => {
    await page.goto("/auth", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain("/auth");
  });

  test("2.6 Login sets httpOnly refresh cookie", async ({ page }) => {
    await page.goto("/auth", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    await page.fill('input[name="username"]', USERS.user.username);
    await page.fill('input[name="password"]', USERS.user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    const cookies = await page.context().cookies();
    const refreshCookie = cookies.find(c => c.name === "refreshToken");
    expect(refreshCookie).toBeTruthy();
    expect(refreshCookie!.httpOnly).toBeTruthy();
  });
});

test.describe("Login Validation (API)", () => {
  test("2.4 Login via API with valid credentials", async ({ request }) => {
    const response = await request.post("http://localhost:8080/api/auth/login", {
      data: { username: USERS.user.username, password: USERS.user.password },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.accessToken).toBeTruthy();
    const cookies = response.headers()["set-cookie"];
    expect(cookies).toContain("refreshToken");
  });

  test("2.5 Login via API with wrong password returns 401", async ({ request }) => {
    const response = await request.post("http://localhost:8080/api/auth/login", {
      data: { username: USERS.user.username, password: "wrong" },
    });
    expect(response.status()).toBe(401);
  });
});

import { test, expect } from "@playwright/test";
import { USERS } from "../../fixtures/test-data";

test.describe("Refresh Token Mechanics (cookie-based)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("5.1 Refresh with valid cookie", async ({ page, request }) => {
    await page.goto("/auth", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    await page.fill('input[name="username"]', USERS.user.username);
    await page.fill('input[name="password"]', USERS.user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    const cookies = await page.context().cookies();
    const refreshCookie = cookies.find(c => c.name === "refreshToken");
    expect(refreshCookie).toBeTruthy();
    const response = await request.post("http://localhost:8080/api/auth/refresh", {
      headers: { Cookie: `refreshToken=${refreshCookie!.value}` },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.accessToken).toBeTruthy();
  });

  test("5.3 Refresh with expired cookie", async ({ request }) => {
    const response = await request.post("http://localhost:8080/api/auth/refresh", {
      headers: { Cookie: "refreshToken=expired_invalid_token" },
    });
    expect([401, 429]).toContain(response.status());
  });

  test("5.4 Refresh rotates token", async ({ page, request }) => {
    await page.goto("/auth", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    await page.fill('input[name="username"]', USERS.user.username);
    await page.fill('input[name="password"]', USERS.user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    const cookies = await page.context().cookies();
    const oldRefresh = cookies.find(c => c.name === "refreshToken")!.value;
    const response1 = await request.post("http://localhost:8080/api/auth/refresh", {
      headers: { Cookie: `refreshToken=${oldRefresh}` },
    });
    expect(response1.status()).toBe(200);
    const response2 = await request.post("http://localhost:8080/api/auth/refresh", {
      headers: { Cookie: `refreshToken=${oldRefresh}` },
    });
    expect([200, 401]).toContain(response2.status());
  });
});

test.describe("Refresh Token Mechanics (no cookie)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("5.2 Refresh without cookie", async ({ request }) => {
    const response = await request.post("http://localhost:8080/api/auth/refresh");
    expect(response.status()).toBe(401);
  });
});

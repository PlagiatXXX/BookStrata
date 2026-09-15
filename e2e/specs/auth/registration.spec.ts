import { test, expect } from "@playwright/test";

test.describe("Registration Flow", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("1.1 Successful registration", async ({ page }) => {
    const unique = Date.now();
    await page.goto("/auth?mode=register", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    await page.fill('input[name="username"]', `e2e_user_${unique}`);
    await page.fill('input[name="email"]', `e2e_${unique}@test.com`);
    await page.fill('input[name="password"]', "StrongPass1!");
    await page.check('input[type="checkbox"]');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    const isOnDashboard = page.url().includes("/dashboard");
    const hasConfirmation = await page.locator("text=/подтвердите|проверьте|отправлено/i")
      .isVisible({ timeout: 5000 }).catch(() => false);
    expect(isOnDashboard || hasConfirmation).toBeTruthy();
  });

  test("1.2 Registration with existing username", async ({ page }) => {
    await page.goto("/auth?mode=register", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    await page.fill('input[name="username"]', "e2e_member");
    await page.fill('input[name="email"]', `unique_${Date.now()}@test.com`);
    await page.fill('input[name="password"]', "StrongPass1!");
    await page.check('input[type="checkbox"]');
    await page.click('button[type="submit"]');
    await expect(page.locator("text=/уже зарегистрирован|занят/i")).toBeVisible({ timeout: 10000 });
  });

  test("1.3 Registration with weak password", async ({ page }) => {
    await page.goto("/auth?mode=register", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    await page.fill('input[name="username"]', `e2e_weak_${Date.now()}`);
    await page.fill('input[name="email"]', `weak_${Date.now()}@test.com`);
    await page.fill('input[name="password"]', "123");
    await page.check('input[type="checkbox"]');
    await page.click('button[type="submit"]');
    await expect(page.locator("p.text-red-500")).toBeVisible({ timeout: 10000 });
  });

  test("1.4 Registration without accepting terms", async ({ page }) => {
    await page.goto("/auth?mode=register", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    await page.fill('input[name="username"]', `e2e_noterms_${Date.now()}`);
    await page.fill('input[name="email"]', `noterms_${Date.now()}@test.com`);
    await page.fill('input[name="password"]', "StrongPass1!");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain("/auth");
  });

  test("1.5 Registration with reserved username", async ({ page }) => {
    await page.goto("/auth?mode=register", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="email"]', `admin_${Date.now()}@test.com`);
    await page.fill('input[name="password"]', "StrongPass1!");
    await page.check('input[type="checkbox"]');
    await page.click('button[type="submit"]');
    await expect(page.locator("text=/зарезервировано|занят/i")).toBeVisible({ timeout: 10000 });
  });

  test("1.6 Registration via API", async ({ request }) => {
    const unique = Date.now();
    const response = await request.post("http://localhost:8080/api/auth/register", {
      data: {
        username: `e2e_newcomer_${unique}`,
        email: `newcomer_${unique}@example.com`,
        password: "StrongPass1!",
        acceptedTerms: true,
      },
    });
    expect(response.status()).toBe(201);
  });
});

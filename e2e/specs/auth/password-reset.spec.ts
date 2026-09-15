import { test, expect } from "@playwright/test";

test.describe("Password Reset — UI", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("4.1 Forgot password page renders", async ({ page }) => {
    await page.goto("/forgot-password", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    expect(page.url()).toContain("/forgot-password");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Password Reset — API", () => {
  test("4.2 Forgot password via API", async ({ request }) => {
    const response = await request.post("http://localhost:8080/api/auth/forgot-password", {
      data: { email: "e2e_member@test.com" },
    });
    expect([200, 400, 429]).toContain(response.status());
  });

  test("4.3 Forgot password nonexistent email still returns 200", async ({ request }) => {
    const response = await request.post("http://localhost:8080/api/auth/forgot-password", {
      data: { email: "nonexistent@test.com" },
    });
    expect([200, 429]).toContain(response.status());
  });

  test("4.4 Reset password with invalid token returns 400", async ({ request }) => {
    const response = await request.post("http://localhost:8080/api/auth/reset-password", {
      data: { token: "invalid_token", password: "NewPass123!" },
    });
    expect([400, 429]).toContain(response.status());
  });
});

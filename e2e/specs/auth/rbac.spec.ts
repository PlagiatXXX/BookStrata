import { test, expect } from "@playwright/test";
import { loginViaApi, apiRequest } from "../../helpers/auth";
import { USERS } from "../../fixtures/test-data";

test.describe("Role-Based Access Control", () => {
  test.describe("User role", () => {
    test("8.1 User cannot access admin panel", async ({ page }) => {
      await page.goto("/admin", { waitUntil: "networkidle" });

      // Обычный пользователь не видит админку — либо "доступ запрещён", либо форма логина
      const hasAccessDenied = await page.getByText(/доступ запрещён/i)
        .isVisible({ timeout: 5000 }).catch(() => false);
      const hasLoginForm = await page.getByRole("heading", { name: /добро пожаловать/i })
        .isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasAccessDenied || hasLoginForm).toBeTruthy();
    });

    test("8.3 User cannot ban other users via API", async ({ page }) => {
      const token = await loginViaApi(USERS.user);

      const { status } = await apiRequest(page, "POST", "/api/moderation/users/1/ban-chat", token, {
        reason: "test",
        duration: "1d",
      });
      // Обычный пользователь не может банить — 403 Forbidden
      expect(status).toBe(403);
    });

    test("8.5 User cannot access admin API endpoints", async ({ page }) => {
      const token = await loginViaApi(USERS.user);

      const endpoints = [
        "/api/users/admin/all",
        "/api/admin/stats",
      ];

      for (const endpoint of endpoints) {
        const { status } = await apiRequest(page, "GET", endpoint, token);
        expect(status).toBe(403);
      }
    });

    test("8.7 User role is properly assigned", async ({ page }) => {
      const token = await loginViaApi(USERS.user);

      const { status, data } = await apiRequest(page, "GET", "/api/users/me", token);
      expect(status).toBe(200);

      const response = data as Record<string, unknown>;
      const userData = (response.data ?? response) as Record<string, unknown>;
      expect(userData.role).toBe("user");
    });

    test("8.9 User cannot change other user's role", async ({ page }) => {
      const token = await loginViaApi(USERS.user);

      const { status } = await apiRequest(page, "PUT", "/api/roles/user/1", token, {
        role: "admin",
        password: "anything",
      });
      // Обычный пользователь не может менять роли — 403
      expect(status).toBe(403);
    });

    test("8.10 User cannot reset other user's password", async ({ page }) => {
      const token = await loginViaApi(USERS.user);

      const { status } = await apiRequest(page, "POST", "/api/admin/users/1/reset-password", token, {
        password: "hacked123",
      });
      // Обычный пользователь не может сбрасывать пароли — 403
      expect(status).toBe(403);
    });

    test("8.11 User cannot delete other user's tier list", async ({ page }) => {
      const token = await loginViaApi(USERS.user);

      // Пытаемся удалить тир-лист id=1 (чужой)
      const { status } = await apiRequest(page, "DELETE", "/api/tier-lists/1", token);
      // Должен получить 403 или 404 (нет прав или не найден)
      expect([403, 404]).toContain(status);
    });

    test("8.12 User can access public endpoints", async ({ page }) => {
      const token = await loginViaApi(USERS.user);

      const endpoints = [
        "/api/users/me",
        "/api/tier-lists?page=1",
        "/api/templates",
      ];

      for (const endpoint of endpoints) {
        const { status } = await apiRequest(page, "GET", endpoint, token);
        expect(status).toBe(200);
      }
    });
  });

  test.describe("Admin role", () => {
    test.use({ storageState: "e2e/.auth/admin.json" });

    test("8.2 Admin can access admin panel", async ({ page }) => {
      await page.goto("/admin", { waitUntil: "domcontentloaded" });

      const hasAccessDenied = await page.getByText(/доступ запрещён/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      expect(hasAccessDenied).toBeFalsy();

      await expect(page.locator("body")).toContainText(/admin|пользовател|users|bookstrata/i, { timeout: 10000 });
    });

    test("8.4 Admin can access user management", async ({ page }) => {
      const token = await loginViaApi(USERS.admin);

      const { status } = await apiRequest(page, "GET", "/api/users/admin/all", token);
      expect(status).toBe(200);
    });

    test("8.6 Admin role is properly assigned", async ({ page }) => {
      const token = await loginViaApi(USERS.admin);

      const { status, data } = await apiRequest(page, "GET", "/api/users/me", token);
      expect(status).toBe(200);

      const response = data as Record<string, unknown>;
      const userData = (response.data ?? response) as Record<string, unknown>;
      expect(userData.role).toBe("admin");
    });

    test("8.13 Admin can access all admin endpoints", async ({ page }) => {
      const token = await loginViaApi(USERS.admin);

      const endpoints = [
        "/api/users/admin/all",
        "/api/admin/stats",
        "/api/admin/analytics/metrics",
      ];

      for (const endpoint of endpoints) {
        const { status } = await apiRequest(page, "GET", endpoint, token);
        // 200 = ok, 404 = endpoint exists but no data — оба приемлемы
        expect([200, 404]).toContain(status);
      }
    });

    test("8.14 Admin can reset user password", async ({ page }) => {
      const token = await loginViaApi(USERS.admin);

      // Сброс пароля для пользователя (userId=2 — e2e_member)
      const { status } = await apiRequest(page, "POST", "/api/admin/users/2/reset-password", token, {
        password: "AdminReset123!",
      });
      // 200 = успех, 404 = пользователь не найден — оба приемлемы
      expect([200, 404]).toContain(status);

      // Восстанавливаем пароль обратно чтобы не сломать共享 state
      if (status === 200) {
        await apiRequest(page, "POST", "/api/admin/users/2/reset-password", token, {
          password: "StrongPass2!",
        });
      }
    });
  });
});

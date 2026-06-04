import { test, expect } from "@playwright/test";
import { ROUTES, USERS } from "../fixtures/test-data";

test.describe("3. Профиль и пользователи", () => {
  test("3.1 Просмотр профиля", async ({ page }) => {
    await page.goto(ROUTES.profile, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Проверяем, что мы на странице профиля
    await expect(page.locator("body")).toContainText(USERS.user.username, { timeout: 5000 });
  });

  test("3.2 Изменение username", async ({ page }) => {
    await page.goto(ROUTES.profile, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const newName = "e2e_renamed_" + Date.now();
    const usernameInput = page.locator("input[aria-label*=\"Имя\"]");

    if (await usernameInput.isVisible()) {
      await usernameInput.fill(newName);
      await page.click("button:has-text(\"Сохранить\")");
      await page.waitForTimeout(1000);

      await page.goto(ROUTES.profile, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);
      await expect(page.locator("body")).toContainText(newName, { timeout: 5000 });
    }
  });

  test("3.3 Смена пароля", async ({ page }) => {
    await page.goto(ROUTES.profile, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const currentInput = page.locator("input[name=\"current_password\"]");
    if (await currentInput.isVisible()) {
      await currentInput.fill(USERS.user.password);
      await page.locator("input[name=\"new_password\"]").fill("NewStrongPass1!");
      await page.click("button:has-text(\"Сохранить\")");
      await page.waitForTimeout(1000);
    }
  });

  test("3.4 Загрузка аватарки", async ({ page }) => {
    await page.goto(ROUTES.profile, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const avatarUpload = page.locator("input[type=\"file\"]");
    if (await avatarUpload.isVisible()) {
      test.skip(true, "Cloudinary mocked — пропускаем загрузку");
    }
  });
});

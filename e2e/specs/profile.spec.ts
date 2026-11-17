import { test, expect, type Page } from "@playwright/test";
import { ROUTES, USERS } from "../fixtures/test-data";
import { apiRequest, loginViaApi } from "../helpers/auth";

interface AuthUser {
  username: string;
  password: string;
}

/** Получить id пользователя через авторизованный `/api/users/me`. */
async function getUserId(page: Page, user: AuthUser): Promise<number> {
  const token = await loginViaApi(user);
  const { status, data } = await apiRequest(page, "GET", "/api/users/me", token);
  if (status !== 200) {
    throw new Error(`Не удалось получить /api/users/me: ${status}`);
  }
  const body = data as { data?: { id?: number }; id?: number };
  const id = body.data?.id ?? body.id;
  if (typeof id !== "number") {
    throw new Error(`В ответе /api/users/me нет id: ${JSON.stringify(data)}`);
  }
  return id;
}

/** Открыть `/users/:id` и дождаться отрисовки hero. */
async function openProfile(page: Page, id: number | string): Promise<void> {
  await page.goto(`/users/${id}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('section[aria-label^="Профиль"]')).toBeVisible();
}

/** Открыть свой профиль через `/profile` (редирект на `/users/:id`). */
async function openOwnProfile(page: Page): Promise<void> {
  await page.goto(ROUTES.profile, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/users\/\d+/, { timeout: 15000 });
  await expect(page.locator('section[aria-label^="Профиль"]')).toBeVisible();
}

test.describe("3. Профиль и пользователи", () => {
  test.describe("Владелец", () => {
    test("3.1 Владелец видит настройки и камеру", async ({ page }) => {
      await openOwnProfile(page);

      // Камера поверх аватара — только владельцу
      await expect(
        page.getByRole("button", { name: "Сменить аватар" }),
      ).toBeVisible();

      // Таб «Настройки» — только владельцу; остальные табы тоже на месте
      const tabs = page.getByRole("tablist", { name: "Разделы профиля" });
      await expect(tabs.getByRole("tab")).toHaveCount(5);
      await expect(tabs.getByRole("tab", { name: "Настройки" })).toBeVisible();

      // Действия владельца в hero
      await expect(
        page.getByRole("button", { name: /Редактировать профиль/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Как видят другие/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Поделиться/ }),
      ).toBeVisible();

      // Навигация сохраняется: «Назад» и хлебные крошки
      await expect(page.getByRole("button", { name: /Назад/ })).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "Хлебные крошки" }),
      ).toBeVisible();

      // Старого перехода нет
      await expect(page.getByText("Вернуться к своему профилю")).toHaveCount(0);
    });

    test("3.2 Переключение табов", async ({ page }) => {
      await openOwnProfile(page);

      const tabs = page.getByRole("tablist", { name: "Разделы профиля" });
      await expect(
        tabs.getByRole("tab", { name: "Обзор" }),
      ).toHaveAttribute("aria-selected", "true");

      await page.getByRole("tab", { name: "Тир-листы" }).click();
      await expect(
        page.getByRole("tab", { name: "Тир-листы" }),
      ).toHaveAttribute("aria-selected", "true");

      await page.getByRole("tab", { name: "Достижения" }).click();
      await expect(
        page.getByRole("tab", { name: "Достижения" }),
      ).toHaveAttribute("aria-selected", "true");

      await page.getByRole("tab", { name: "Настройки" }).click();
      await expect(
        page.getByRole("tab", { name: "Настройки" }),
      ).toHaveAttribute("aria-selected", "true");

      // Экран настроек: аккаунт, аватар, пароль, плеер, жанры, соцсети
      await expect(page.getByTestId("settings-account")).toBeVisible();
      await expect(page.getByText("Имя пользователя", { exact: true })).toBeVisible();
      await expect(page.getByText(USERS.user.email)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Пароль" }),
      ).toBeVisible();
      await expect(page.getByText("Фоновый плеер")).toBeVisible();
      await expect(page.getByTestId("settings-genres")).toBeVisible();
      await expect(page.getByTestId("settings-social")).toBeVisible();
    });

    test("3.3 Аватар открывает AvatarSelector", async ({ page }) => {
      await openOwnProfile(page);

      await page.getByRole("button", { name: "Сменить аватар" }).click();

      const avatarDialog = page
        .locator("div.fixed.inset-0")
        .filter({
          has: page.getByRole("heading", { name: "Выберите аватар" }),
        });
      await expect(avatarDialog).toBeVisible();
      await expect(
        avatarDialog.getByRole("tablist", { name: "Параметры аватара" }),
      ).toBeVisible();

      await avatarDialog.getByRole("button", { name: "Закрыть" }).click();
      await expect(
        page.getByRole("heading", { name: "Выберите аватар" }),
      ).toHaveCount(0);
    });
  });

  test.describe("Посетитель", () => {
    test("3.4 Гость не видит настройки и камеру", async ({ browser }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      });
      const page = await context.newPage();

      try {
        const ownerId = await getUserId(page, USERS.user);
        await openProfile(page, ownerId);

        await expect(
          page.locator('section[aria-label^="Профиль"]'),
        ).toBeVisible();

        // Гость не видит ничего из управления профилем
        await expect(
          page.getByRole("button", { name: "Сменить аватар" }),
        ).toHaveCount(0);
        await expect(
          page.getByRole("tab", { name: "Настройки" }),
        ).toHaveCount(0);
        await expect(
          page.getByRole("button", { name: /Редактировать профиль/ }),
        ).toHaveCount(0);
        await expect(
          page.getByRole("button", { name: /Как видят другие/ }),
        ).toHaveCount(0);
        await expect(
          page.getByRole("button", { name: "Управление" }),
        ).toHaveCount(0);

        // Общие для всех действия и навигация остаются
        await expect(
          page.getByRole("button", { name: /Поделиться/ }),
        ).toBeVisible();
        await expect(page.getByRole("button", { name: /Назад/ })).toBeVisible();
        await expect(
          page.getByRole("navigation", { name: "Хлебные крошки" }),
        ).toBeVisible();
        await expect(page.getByText("Вернуться к своему профилю")).toHaveCount(0);
      } finally {
        await context.close();
      }
    });

    test("3.5 Чужой профиль без управления", async ({ page }) => {
      const adminId = await getUserId(page, USERS.admin);
      await openProfile(page, adminId);

      await expect(
        page.locator('section[aria-label^="Профиль"]'),
      ).toBeVisible();

      // Обычный авторизованный посетитель не видит модерацию и настройки
      await expect(
        page.getByRole("button", { name: "Управление" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Сменить аватар" }),
      ).toHaveCount(0);
      const tabs = page.getByRole("tablist", { name: "Разделы профиля" });
      await expect(tabs.getByRole("tab")).toHaveCount(4);
      await expect(tabs.getByRole("tab", { name: "Настройки" })).toHaveCount(0);

      await expect(
        page.getByRole("button", { name: /Поделиться/ }),
      ).toBeVisible();
      await expect(page.getByText("Вернуться к своему профилю")).toHaveCount(0);
    });
  });
});

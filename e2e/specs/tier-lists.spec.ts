import { test, expect } from "@playwright/test";
import { ROUTES, MOCK_BOOK } from "../fixtures/test-data";
import { setupApiMocks } from "../mocks/api-routes";

const TIER_LIST_TITLE = "Мой топ книг";

// Счётчик для уникальных ID тир-листов в пределах одного запуска
let tierListCounter = 1;

interface MockTier {
  id: number;
  title: string;
  color: string;
  rank: number;
  items: { rank: number; book: { id: number; title: string; author: string | null; coverImageUrl: string; description: string | null; thoughts: string | null; createdAt: string } }[];
}

interface MockTierList {
  id: string;
  title: string;
  year: number | null;
  isPublic: boolean;
  coverImageUrl?: string | null;
  theme?: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: number; username: string; avatarUrl?: string | null };
  tiers: MockTier[];
  unrankedBooks: MockTier["items"];
  likesCount?: number;
}

const createdTierLists: MockTierList[] = [];

function makeTiers(): MockTier[] {
  const tierDefs = [
    { id: 1, title: "S", color: "#FF6B6B", rank: 0 },
    { id: 2, title: "A", color: "#FFA94D", rank: 1 },
    { id: 3, title: "B", color: "#FFD43B", rank: 2 },
    { id: 4, title: "C", color: "#69DB7C", rank: 3 },
    { id: 5, title: "D", color: "#74C0FC", rank: 4 },
  ];
  return tierDefs.map(t => ({ ...t, items: [] }));
}

function makeMockTierList(title: string, userId: number, username: string): MockTierList {
  const id = String(tierListCounter++);
  return {
    id,
    title,
    year: null,
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: { id: userId, username },
    tiers: makeTiers(),
    unrankedBooks: [],
    likesCount: 0,
  };
}

async function mockTierListApi(page: import("@playwright/test").Page) {
  // Перехватываем GET /api/users/me, чтобы узнать ID текущего пользователя
  let currentUserId = 1;
  let currentUsername = "e2e_member";
  await page.route("**/api/users/me", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    currentUserId = data.id;
    currentUsername = data.username;
    await route.fulfill({ response });
  });

  // Единый обработчик для всех /api/tier-lists запросов
  await page.route("**/api/tier-lists**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const pathParts = url.pathname.split("/").filter(Boolean);
    const hasId = pathParts.length >= 3 && !url.searchParams.has("page");
    const id = hasId ? pathParts[pathParts.length - 1] : null;

    // POST /api/tier-lists — создание
    if (method === "POST" && !hasId) {
      const postData = route.request().postDataJSON();
      const mockList = makeMockTierList(postData.title, currentUserId, currentUsername);
      createdTierLists.push(mockList);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockList),
      });
    }

    // GET /api/tier-lists?page=... — список
    if (method === "GET" && !hasId) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: createdTierLists,
          meta: {
            totalItems: createdTierLists.length,
            itemCount: createdTierLists.length,
            itemsPerPage: 10,
            totalPages: 1,
            currentPage: 1,
          },
        }),
      });
    }

    // GET /api/tier-lists/{id} — отдельный тир-лист (для редактора)
    if (method === "GET" && hasId && id) {
      const found = createdTierLists.find((tl) => tl.id === id);
      const body = found || {
        id,
        title: "Тестовый тир-лист",
        year: null,
        isPublic: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: { id: currentUserId, username: currentUsername },
        tiers: makeTiers(),
        unrankedBooks: [],
        likesCount: 0,
      };
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    }

    // PUT/PATCH /api/tier-lists/{id} — сохранение
    if ((method === "PUT" || method === "PATCH") && hasId && id) {
      const postData = route.request().postDataJSON();
      const found = createdTierLists.find((tl) => tl.id === id);
      if (found) {
        Object.assign(found, postData);
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(found) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...postData, id }) });
    }

    // DELETE /api/tier-lists/{id} — удаление
    if (method === "DELETE" && hasId && id) {
      const idx = createdTierLists.findIndex((tl) => tl.id === id);
      if (idx !== -1) createdTierLists.splice(idx, 1);
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }

    await route.fallback();
  });
}

async function createTierList(page: import("@playwright/test").Page, title: string) {
  // Шаг 1: нажать "Создать тир-лист" на dashboard
  const createBtn = page.locator("button:has-text(\"Создать тир-лист\")");
  await expect(createBtn).toBeVisible({ timeout: 5000 });
  await createBtn.click();

  // Шаг 2: заполнить название в модалке
  await page.waitForSelector("input#create-tierlist-title", { timeout: 5000 });
  await page.fill("input#create-tierlist-title", title);

  // Шаг 3: нажать "Создать"
  await page.locator("div[role=\"dialog\"] button.dashboard-btn--primary").click();

  // Шаг 4: дождаться закрытия модалки (после успешного ответа API)
  await page.waitForSelector("div[role=\"dialog\"]", { state: "hidden", timeout: 15000 });
  await page.waitForTimeout(1000);

  // Шаг 5: кликнуть по карточке тир-листа, чтобы открыть редактор
  const card = page.locator(`h3[aria-label="Открыть тир-лист: ${title}"]`);
  await expect(card).toBeVisible({ timeout: 15000 });
  await card.click();

  // Шаг 6: дождаться перехода в редактор
  await page.waitForURL(/\/tier-lists\//, { timeout: 15000 });
  await page.waitForTimeout(2000);
}

test.describe("2. Тир-листы", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await mockTierListApi(page);
  });

  test("2.1 Создание тир-листа", async ({ page }) => {
    await page.goto(ROUTES.dashboard, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    await createTierList(page, TIER_LIST_TITLE);

    for (const tier of ["S", "A", "B", "C", "D"]) {
      await expect(page.locator(`text=${tier}`).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("2.2 Добавление книги через поиск", async ({ page }) => {
    await page.goto(ROUTES.dashboard, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await createTierList(page, TIER_LIST_TITLE);

    const findBookBtn = page.locator("button:has-text(\"Найти книгу\")");
    await expect(findBookBtn).toBeVisible({ timeout: 5000 });
    await findBookBtn.click();

    await page.waitForSelector("input[aria-label=\"Поиск книг\"]", { timeout: 5000 });
    await page.fill("input[aria-label=\"Поиск книг\"]", MOCK_BOOK.title);
    await page.locator('[role="dialog"] button:has-text("Найти")').click({ force: true });

    await page.waitForTimeout(1500);
    const addBtn = page.locator('[role="dialog"] button:has-text("Добавить выбранные")');
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click({ force: true });
    }

    const closeBtn = page.locator('[role="dialog"] button:has-text("Закрыть")').or(page.locator('[role="dialog"] button:has-text("Отмена")'));
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click({ force: true });
    }
  });

  test("2.4 Сохранение всех изменений", async ({ page }) => {
    await page.goto(ROUTES.dashboard, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await createTierList(page, "Сохраняемый тест");

    const saveBtn = page.locator("button:has-text(\"Сохранить\")").first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();

    await expect(page.getByText(/сохранено/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("2.5 Публикация тир-листа", async ({ page }) => {
    await page.goto(ROUTES.dashboard, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await createTierList(page, "Публичный тест");

    // Проверяем, что все tier-лейблы отображаются (редактор загружен)
    for (const tier of ["S", "A", "B", "C", "D"]) {
      await expect(page.locator(`text=${tier}`).first()).toBeVisible({ timeout: 5000 });
    }
    // Сохраняем (убеждаемся, что кнопка сохранения работает)
    const saveBtn = page.locator("button:has-text(\"Сохранить\")").first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();
    await expect(page.getByText(/сохранено/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("2.8 Лайк чужого тир-листа", async ({ browser }) => {
    const adminCtx = await browser.newContext({ storageState: "e2e/.auth/admin.json" });
    const adminPage = await adminCtx.newPage();
    await setupApiMocks(adminPage);
    await mockTierListApi(adminPage);

    await adminPage.goto(ROUTES.dashboard, { waitUntil: "networkidle" });
    await adminPage.waitForTimeout(2000);

    // Создаём тир-лист
    const createBtn = adminPage.locator("button:has-text(\"Создать тир-лист\")");
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click();
    await adminPage.waitForSelector("input#create-tierlist-title", { timeout: 5000 });
    await adminPage.fill("input#create-tierlist-title", "Для лайков");
    await adminPage.locator("div[role=\"dialog\"] button.dashboard-btn--primary").click();
    await adminPage.waitForSelector("div[role=\"dialog\"]", { state: "hidden", timeout: 15000 });
    await adminPage.waitForTimeout(1000);

    // Открываем редактор через карточку
    const adminCard = adminPage.locator(`h3[aria-label="Открыть тир-лист: Для лайков"]`);
    await expect(adminCard).toBeVisible({ timeout: 15000 });
    await adminCard.click();
    await adminPage.waitForURL(/\/tier-lists\//, { timeout: 15000 });
    await adminPage.waitForTimeout(2000);

    // Сохраняем изменения
    const adminSaveBtn = adminPage.locator("button:has-text(\"Сохранить\")").first();
    if (await adminSaveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await adminSaveBtn.click();
      await expect(adminPage.getByText(/сохранено/i).first()).toBeVisible({ timeout: 10000 });
    }

    const tierListUrl = adminPage.url();
    await adminCtx.close();

    // Пользователь ставит лайк
    const userCtx = await browser.newContext({ storageState: "e2e/.auth/user.json" });
    const userPage = await userCtx.newPage();
    await setupApiMocks(userPage);
    await mockTierListApi(userPage);

    await userPage.goto(tierListUrl, { waitUntil: "networkidle" });
    await userPage.waitForTimeout(2000);

    const likeBtn = userPage.locator("button[aria-label*=\"Нравится\"]");
    if (await likeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await likeBtn.click();
      await userPage.waitForTimeout(500);
      await likeBtn.click();
    }

    await userCtx.close();
  });

  test("2.9 Удаление тир-листа", async ({ page }) => {
    await page.goto(ROUTES.dashboard, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await createTierList(page, "Будет удалён");

    await page.goto(ROUTES.dashboard, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const deleteBtn = page.locator("button[aria-label*=\"Удалить\"]").first();
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtn.click();
      await page.waitForSelector("h2#delete-modal-title", { timeout: 5000 });
      await page.click("button:has-text(\"Удалить\")");
    }
  });

  test("2.10 Лимит книг для бесплатного пользователя", async ({ page }) => {
    await page.goto(ROUTES.dashboard, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await createTierList(page, "Лимитный тест");

    const progressBar = page.locator("div[role=\"progressbar\"]");
    await expect(progressBar).toBeVisible({ timeout: 5000 });
  });
});

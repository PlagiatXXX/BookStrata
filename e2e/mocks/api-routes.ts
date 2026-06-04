import type { Page } from "@playwright/test";

export async function setupApiMocks(page: Page) {
  // Google Books API (search through backend proxy)
  await page.route("*/**/api/books/search*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            id: 1,
            title: "Тестовая книга",
            author: "Тестовый Автор",
            coverUrl: "https://example.com/cover.jpg",
            description: "Описание тестовой книги",
          },
        ],
      }),
    });
  });

  // External news (RSS)
  await page.route("*/**/api/external-news*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }),
    });
  });

  // Forgot-password (чтобы не зависеть от внешнего SMTP)
  await page.route("*/**/api/auth/forgot-password*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "Инструкции отправлены на почту" }),
    });
  });

  // AI Librarian
  await page.route("*/**/api/ai/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: { recommendations: [], message: "AI temporarily unavailable in test mode" },
      }),
    });
  });

  // Cloudinary upload (frontend direct)
  await page.route("*/**/cloudinary*/upload*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        secure_url: "https://example.com/mocked-upload.jpg",
        public_id: "mocked_upload",
      }),
    });
  });
}

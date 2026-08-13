// backend/src/modules/bookPages/bookRedirect.route.spec.ts
// Публичный GET /books/:slug (Фаза 6, seobook.md):
//   - старый slug из BookSlugHistory → 301 на актуальный (не JSON-подсказка из API),
//   - актуальный published slug → пререндеренный HTML (если файл есть),
//   - непререндеренная published книга → SEO-фолбэк (title/description/canonical/OG из БД),
//   - неизвестный/draft slug → 404 noindex,
//   - небезопасный slug (path traversal) → 404.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import Fastify from "fastify";

const mocks = vi.hoisted(() => ({
  config: {
    CLIENT_URL: "https://bookstrata.ru",
    DIST_DIR: "/app/dist",
  },
  prisma: {
    bookSlugHistory: { findUnique: vi.fn() },
    book: { findUnique: vi.fn() },
  },
  fs: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}));

vi.mock("../../lib/prisma.js", () => ({ prisma: mocks.prisma }));
vi.mock("../../config/env.js", () => ({ config: mocks.config }));
vi.mock("node:fs", () => mocks.fs);

import { bookRedirectRoutes } from "./bookRedirect.route.js";

const PRERENDERED_HTML =
  "<!DOCTYPE html><html><head><title>Анна Каренина — пререндер</title></head><body>OK</body></html>";
const SPA_SHELL =
  "<!DOCTYPE html><html><head><meta charset=\"utf-8\" /><title>BookStrata</title></head><body><div id=\"root\"></div></body></html>";

const publishedBook = {
  slug: "anna-karenina-lev-tolstoj",
  title: "Анна Каренина",
  author: "Лев Толстой",
  description: "Роман о любви и обществе.",
  coverImageUrl: "/covers/anna.jpg",
  status: "published",
};

describe("GET /books/:slug (публичный роут)", () => {
  let app: ReturnType<typeof Fastify>;

  async function createApp() {
    const instance = Fastify({ logger: false });
    await instance.register(bookRedirectRoutes);
    await instance.ready();
    return instance;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.fs.existsSync.mockReturnValue(false);
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
    vi.resetAllMocks();
  });

  it("старый slug из BookSlugHistory → 301 на актуальный", async () => {
    mocks.prisma.bookSlugHistory.findUnique.mockResolvedValue({
      book: { slug: "anna-karenina-lev-tolstoj", status: "published" },
    });

    const res = await request(app.server).get("/books/anna-karenina");

    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("/books/anna-karenina-lev-tolstoj");
    expect(mocks.prisma.bookSlugHistory.findUnique).toHaveBeenCalledWith({
      where: { oldSlug: "anna-karenina" },
      select: { book: { select: { slug: true, status: true } } },
    });
    // Найденная книга не запрашивается повторно
    expect(mocks.prisma.book.findUnique).not.toHaveBeenCalled();
  });

  it("oldSlug из истории у draft-книги → не 301, а 404", async () => {
    mocks.prisma.bookSlugHistory.findUnique.mockResolvedValue({
      book: { slug: "draft-book", status: "draft" },
    });

    const res = await request(app.server).get("/books/old-draft");

    expect(res.status).toBe(404);
  });

  it("актуальный published slug с пререндер-файлом → отдаёт пререндеренный HTML", async () => {
    mocks.prisma.bookSlugHistory.findUnique.mockResolvedValue(null);
    mocks.prisma.book.findUnique.mockResolvedValue(publishedBook);
    mocks.fs.existsSync.mockImplementation((p: string) => String(p).includes("books/anna-karenina-lev-tolstoj/index.html"));
    mocks.fs.readFileSync.mockReturnValue(PRERENDERED_HTML);

    const res = await request(app.server).get("/books/anna-karenina-lev-tolstoj");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain("Анна Каренина — пререндер");
  });

  it("published без пререндера → SEO-фолбэк с meta книги (title/canonical/OG) из БД", async () => {
    mocks.prisma.bookSlugHistory.findUnique.mockResolvedValue(null);
    mocks.prisma.book.findUnique.mockResolvedValue(publishedBook);
    // Пререндера книги нет, но spa-каркас доступен
    mocks.fs.existsSync.mockImplementation((p: string) => String(p).endsWith("spa-index.html"));
    mocks.fs.readFileSync.mockReturnValue(SPA_SHELL);

    const res = await request(app.server).get("/books/anna-karenina-lev-tolstoj");

    expect(res.status).toBe(200);
    expect(res.text).toContain("<title>Анна Каренина — Лев Толстой — описание и рейтинг</title>");
    expect(res.text).toContain('<link rel="canonical" href="https://bookstrata.ru/books/anna-karenina-lev-tolstoj" />');
    expect(res.text).toContain('<meta property="og:title" content="Анна Каренина — Лев Толстой — описание и рейтинг" />');
    expect(res.text).toContain('content="Роман о любви и обществе."');
    expect(res.text).toContain('<meta property="og:image" content="/covers/anna.jpg" />');
    expect(res.text).toContain('<div id="root"></div>');
  });

  it("SEO-фолбэк без DIST_DIR (dev) → standalone HTML с meta", async () => {
    mocks.config.DIST_DIR = undefined as unknown as string;
    mocks.prisma.bookSlugHistory.findUnique.mockResolvedValue(null);
    mocks.prisma.book.findUnique.mockResolvedValue(publishedBook);

    const res = await request(app.server).get("/books/anna-karenina-lev-tolstoj");

    expect(res.status).toBe(200);
    expect(res.text).toContain("<title>Анна Каренина — Лев Толстой — описание и рейтинг</title>");
    expect(res.text).toContain('rel="canonical" href="https://bookstrata.ru/books/anna-karenina-lev-tolstoj"');
    mocks.config.DIST_DIR = "/app/dist";
  });

  it("неизвестный slug → 404 noindex", async () => {
    mocks.prisma.bookSlugHistory.findUnique.mockResolvedValue(null);
    mocks.prisma.book.findUnique.mockResolvedValue(null);

    const res = await request(app.server).get("/books/unknown-book");

    expect(res.status).toBe(404);
    expect(res.text).toContain("Книга не найдена");
    expect(res.text).toContain('content="noindex"');
  });

  it("draft-книга → 404 (не публикуется через URL)", async () => {
    mocks.prisma.bookSlugHistory.findUnique.mockResolvedValue(null);
    mocks.prisma.book.findUnique.mockResolvedValue({ ...publishedBook, status: "draft" });

    const res = await request(app.server).get("/books/draft-book");

    expect(res.status).toBe(404);
  });

  it("небезопасный slug (path traversal) → 404, файл не читается", async () => {
    const res = await request(app.server).get("/books/..%2F..%2Fetc%2Fpasswd");

    expect(res.status).toBe(404);
    expect(mocks.fs.existsSync).not.toHaveBeenCalled();
  });
});

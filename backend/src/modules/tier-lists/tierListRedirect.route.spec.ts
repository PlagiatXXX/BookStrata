// backend/src/modules/tier-lists/tierListRedirect.route.spec.ts
// Публичный GET /tier-lists/:slug (nginx проксирует сюда, если нет файла пререндера):
//   - /tier-lists/new → SPA-каркас (200),
//   - несуществующий/удалённый slug → 404 со статусом 404 и <meta name="robots" content="noindex" />,
//   - запрос по UUID при наличии slug → 301 редирект на канонический /tier-lists/:slug,
//   - приватный тир-лист (isPublic: false) → SPA-каркас с <meta name="robots" content="noindex, nofollow" />,
//   - публичный тир-лист с 0 книг → SPA-каркас с <meta name="robots" content="noindex, nofollow" />,
//   - актуальный тир-лист с пререндером → отдача готового пререндеренного HTML,
//   - актуальный тир-лист без пререндера → SEO-фолбэк (title/description/canonical/OG из БД),
//   - небезопасный slug (path traversal) → 404.
import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";

const mocks = vi.hoisted(() => ({
  config: {
    CLIENT_URL: "https://bookstrata.ru",
    DIST_DIR: "/app/dist",
  },
  prisma: {
    tierList: { findFirst: vi.fn() },
  },
  fs: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}));

vi.mock("../../lib/prisma.js", () => ({ prisma: mocks.prisma }));
vi.mock("../../config/env.js", () => ({ config: mocks.config }));
vi.mock("node:fs", () => mocks.fs);

import { tierListRedirectRoutes } from "./tierListRedirect.route.js";

const PRERENDERED_HTML =
  '<!DOCTYPE html><html><head><title>Мой топ — пререндер</title></head><body>OK</body></html>';
const SPA_SHELL =
  '<!DOCTYPE html><html><head><meta charset="utf-8" /><title>BookStrata</title></head><body><div id="root"></div></body></html>';

describe("GET /tier-lists/:slug (публичный серверный роут)", () => {
  let app: ReturnType<typeof Fastify>;

  async function createApp() {
    const instance = Fastify({ logger: false });
    await instance.register(tierListRedirectRoutes);
    await instance.ready();
    return instance;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.fs.existsSync.mockReturnValue(false);
    app = await createApp();
  });

  it("GET /tier-lists/new отдаёт 200 и SPA-каркас", async () => {
    mocks.fs.existsSync.mockImplementation((file: string) => file.endsWith("spa-index.html"));
    mocks.fs.readFileSync.mockReturnValue(SPA_SHELL);

    const res = await app.inject({ method: "GET", url: "/tier-lists/new" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<div id="root"></div>');
    expect(mocks.prisma.tierList.findFirst).not.toHaveBeenCalled();
  });

  it("небезопасный slug (path traversal) отдаёт 404 с noindex", async () => {
    const res = await app.inject({ method: "GET", url: "/tier-lists/..%2F..%2Fetc" });

    expect(res.statusCode).toBe(404);
    expect(res.body).toContain('name="robots" content="noindex"');
  });

  it("удалённый / несуществующий slug отдаёт 404 со статусом 404 и noindex (не 200 Soft 404!)", async () => {
    mocks.prisma.tierList.findFirst.mockResolvedValue(null);

    const res = await app.inject({ method: "GET", url: "/tier-lists/tir-list-leta2026-p5tes4" });

    expect(res.statusCode).toBe(404);
    expect(res.body).toContain("Тир-лист не найден");
    expect(res.body).toContain('name="robots" content="noindex"');
  });

  it("запрос по UUID перенаправляет на актуальный slug с 301 Permanent Redirect", async () => {
    const uuid = "65004661-8412-49f8-bc36-8fdaaf47b33f";
    mocks.prisma.tierList.findFirst.mockResolvedValue({
      id: uuid,
      slug: "moj-top-detektivov",
      title: "Мой топ",
      isPublic: true,
      _count: { placements: 5 },
      user: { username: "fedor" },
    });

    const res = await app.inject({ method: "GET", url: `/tier-lists/${uuid}` });

    expect(res.statusCode).toBe(301);
    expect(res.headers.location).toBe("/tier-lists/moj-top-detektivov");
  });

  it("приватный тир-лист отдаёт 200 и каркас с meta name=robots content=noindex, nofollow", async () => {
    mocks.fs.existsSync.mockImplementation((file: string) => file.endsWith("spa-index.html"));
    mocks.fs.readFileSync.mockReturnValue(SPA_SHELL);

    mocks.prisma.tierList.findFirst.mockResolvedValue({
      id: "tl-priv-1",
      slug: "private-list",
      title: "Приватный список",
      isPublic: false,
      _count: { placements: 10 },
      user: { username: "secret" },
    });

    const res = await app.inject({ method: "GET", url: "/tier-lists/private-list" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('name="robots" content="noindex, nofollow"');
  });

  it("тир-лист с 0 книг отдаёт 200 и каркас с meta name=robots content=noindex, nofollow (Thin content)", async () => {
    mocks.fs.existsSync.mockImplementation((file: string) => file.endsWith("spa-index.html"));
    mocks.fs.readFileSync.mockReturnValue(SPA_SHELL);

    mocks.prisma.tierList.findFirst.mockResolvedValue({
      id: "tl-empty-1",
      slug: "empty-list",
      title: "Пустой список",
      isPublic: true,
      _count: { placements: 0 },
      user: { username: "author" },
    });

    const res = await app.inject({ method: "GET", url: "/tier-lists/empty-list" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('name="robots" content="noindex, nofollow"');
  });

  it("публичный тир-лист с пререндером на диске отдаёт готовый пререндеренный HTML", async () => {
    mocks.fs.existsSync.mockImplementation((file: string) =>
      file.includes("/tier-lists/top-detectives/index.html"),
    );
    mocks.fs.readFileSync.mockReturnValue(PRERENDERED_HTML);

    mocks.prisma.tierList.findFirst.mockResolvedValue({
      id: "tl-1",
      slug: "top-detectives",
      title: "Топ детективов",
      isPublic: true,
      _count: { placements: 5 },
      user: { username: "fedor" },
    });

    const res = await app.inject({ method: "GET", url: "/tier-lists/top-detectives" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(PRERENDERED_HTML);
  });

  it("свежий тир-лист без пререндера отдаёт SEO-фолбэк с meta-тегами из БД", async () => {
    mocks.fs.existsSync.mockImplementation((file: string) => file.endsWith("spa-index.html"));
    mocks.fs.readFileSync.mockReturnValue(SPA_SHELL);

    mocks.prisma.tierList.findFirst.mockResolvedValue({
      id: "tl-new-1",
      slug: "fresh-books",
      title: "Свежие книги",
      description: "Мой свежий тир-лист книг",
      isPublic: true,
      _count: { placements: 7 },
      user: { username: "fedor" },
      coverImageUrl: "https://bookstrata.ru/img/cover.webp",
    });

    const res = await app.inject({ method: "GET", url: "/tier-lists/fresh-books" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("<title>Свежие книги — книжный тир-лист из 7 книг от fedor | BookStrata</title>");
    expect(res.body).toContain('<link rel="canonical" href="https://bookstrata.ru/tier-lists/fresh-books" />');
    expect(res.body).toContain('meta property="og:title" content="Свежие книги — книжный тир-лист из 7 книг от fedor | BookStrata"');
    expect(res.body).toContain('meta property="og:image" content="https://bookstrata.ru/img/cover.webp"');
    expect(res.body).toContain('meta name="twitter:card" content="summary_large_image"');
  });

  it("свежий тир-лист без coverImageUrl подтягивает обложку первой книги для Open Graph и Twitter", async () => {
    mocks.fs.existsSync.mockImplementation((file: string) => file.endsWith("spa-index.html"));
    mocks.fs.readFileSync.mockReturnValue(SPA_SHELL);

    mocks.prisma.tierList.findFirst.mockResolvedValue({
      id: "tl-new-2",
      slug: "zolotoj-listopad",
      title: "Золотой листопад",
      description: null,
      isPublic: true,
      _count: { placements: 5 },
      user: { username: "fedor" },
      coverImageUrl: null,
      placements: [
        {
          tierId: 1,
          thoughts: null,
          coverImageUrl: null,
          book: { coverImageUrl: "https://bookstrata.ru/img/book-1.webp" },
        },
        { tierId: 1, thoughts: null, coverImageUrl: null, book: { coverImageUrl: null } },
        { tierId: 1, thoughts: null, coverImageUrl: null, book: { coverImageUrl: null } },
        { tierId: 1, thoughts: null, coverImageUrl: null, book: { coverImageUrl: null } },
        { tierId: 1, thoughts: null, coverImageUrl: null, book: { coverImageUrl: null } },
      ],
    });

    const res = await app.inject({ method: "GET", url: "/tier-lists/zolotoj-listopad" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('meta property="og:image" content="https://bookstrata.ru/img/book-1.webp"');
    expect(res.body).toContain('meta name="twitter:image" content="https://bookstrata.ru/img/book-1.webp"');
    expect(res.body).toContain('meta name="twitter:card" content="summary_large_image"');
  });

  it("тир-лист с 10 книгами в unranked (0 расставленных по тирам) отдаёт noindex, nofollow", async () => {
    mocks.fs.existsSync.mockImplementation((file: string) => file.endsWith("spa-index.html"));
    mocks.fs.readFileSync.mockReturnValue(SPA_SHELL);

    mocks.prisma.tierList.findFirst.mockResolvedValue({
      id: "tl-unranked-1",
      slug: "da-fbe89u",
      title: "Мой длинный список без рейтинга",
      description: null,
      isPublic: true,
      _count: { placements: 10 },
      placements: Array.from({ length: 10 }, () => ({
        tierId: null,
        thoughts: null,
        coverImageUrl: null,
        book: { coverImageUrl: null },
      })),
      user: { username: "Saiona" },
    });

    const res = await app.inject({ method: "GET", url: "/tier-lists/da-fbe89u" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('name="robots" content="noindex, nofollow"');
  });

  it("тир-лист с 4 расставленными книгами (< 5) отдаёт noindex, nofollow", async () => {
    mocks.fs.existsSync.mockImplementation((file: string) => file.endsWith("spa-index.html"));
    mocks.fs.readFileSync.mockReturnValue(SPA_SHELL);

    mocks.prisma.tierList.findFirst.mockResolvedValue({
      id: "tl-small-1",
      slug: "small-list",
      title: "Четыре отличные книги",
      description: null,
      isPublic: true,
      _count: { placements: 4 },
      placements: Array.from({ length: 4 }, () => ({
        tierId: 1,
        thoughts: null,
        coverImageUrl: null,
        book: { coverImageUrl: null },
      })),
      user: { username: "fedor" },
    });

    const res = await app.inject({ method: "GET", url: "/tier-lists/small-list" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('name="robots" content="noindex, nofollow"');
  });

  it("тир-лист с коротким/шаблонным названием без описания и мыслей отдаёт noindex, nofollow", async () => {
    mocks.fs.existsSync.mockImplementation((file: string) => file.endsWith("spa-index.html"));
    mocks.fs.readFileSync.mockReturnValue(SPA_SHELL);

    mocks.prisma.tierList.findFirst.mockResolvedValue({
      id: "tl-generic-1",
      slug: "tir-list-6q2uc6",
      title: "Тир-лист",
      description: null,
      isPublic: true,
      _count: { placements: 12 },
      placements: Array.from({ length: 12 }, () => ({
        tierId: 1,
        thoughts: null,
        coverImageUrl: null,
        book: { coverImageUrl: null },
      })),
      user: { username: "kurteevakate" },
    });

    const res = await app.inject({ method: "GET", url: "/tier-lists/tir-list-6q2uc6" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('name="robots" content="noindex, nofollow"');
  });

  it("тир-лист с шаблонным названием, но с мыслями автора и >= 5 книгами индексируется", async () => {
    mocks.fs.existsSync.mockImplementation((file: string) => file.endsWith("spa-index.html"));
    mocks.fs.readFileSync.mockReturnValue(SPA_SHELL);

    mocks.prisma.tierList.findFirst.mockResolvedValue({
      id: "tl-thoughts-1",
      slug: "tir-list-thoughts",
      title: "Тир-лист",
      description: null,
      isPublic: true,
      _count: { placements: 5 },
      placements: [
        { tierId: 1, thoughts: "Очень сильная книга", coverImageUrl: null, book: { coverImageUrl: null } },
        { tierId: 1, thoughts: null, coverImageUrl: null, book: { coverImageUrl: null } },
        { tierId: 1, thoughts: null, coverImageUrl: null, book: { coverImageUrl: null } },
        { tierId: 1, thoughts: null, coverImageUrl: null, book: { coverImageUrl: null } },
        { tierId: 1, thoughts: null, coverImageUrl: null, book: { coverImageUrl: null } },
      ],
      user: { username: "fedor" },
    });

    const res = await app.inject({ method: "GET", url: "/tier-lists/tir-list-thoughts" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('name="robots" content="index, follow"');
  });

  it("обрезает домен email у логина автора в SEO-фолбэке", async () => {
    mocks.fs.existsSync.mockImplementation((file: string) => file.endsWith("spa-index.html"));
    mocks.fs.readFileSync.mockReturnValue(SPA_SHELL);

    mocks.prisma.tierList.findFirst.mockResolvedValue({
      id: "tl-email-1",
      slug: "moj-top-knig",
      title: "Мой топ фантастики",
      description: null,
      isPublic: true,
      _count: { placements: 6 },
      placements: Array.from({ length: 6 }, () => ({
        tierId: 1,
        thoughts: null,
        coverImageUrl: null,
        book: { coverImageUrl: null },
      })),
      user: { username: "nazar199947@gmail.com" },
    });

    const res = await app.inject({ method: "GET", url: "/tier-lists/moj-top-knig" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("от nazar199947 | BookStrata");
    expect(res.body).not.toContain("gmail.com");
  });
});

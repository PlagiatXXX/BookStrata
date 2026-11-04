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
  });
});

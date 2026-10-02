// backend/src/modules/sitemap/sitemap.service.spec.ts
// Sitemap: страницы авторов /authors и /authors/:slug — все авторы со slug
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    newsArticle: { findMany: vi.fn() },
    tierList: { findMany: vi.fn() },
    collection: { findMany: vi.fn() },
    celebrity: { findMany: vi.fn() },
    book: { findMany: vi.fn() },
    author: { findMany: vi.fn() },
  },
}));

vi.mock("../../lib/prisma.js", () => ({ prisma: mocks.prisma }));
vi.mock("../../config/env.js", () => ({
  config: { CLIENT_URL: "https://bookstrata.ru" },
}));

import { generateSitemap } from "./sitemap.service.js";

describe("generateSitemap — страницы авторов", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.newsArticle.findMany.mockResolvedValue([]);
    mocks.prisma.tierList.findMany.mockResolvedValue([]);
    mocks.prisma.collection.findMany.mockResolvedValue([]);
    mocks.prisma.celebrity.findMany.mockResolvedValue([]);
    mocks.prisma.book.findMany.mockResolvedValue([]);
    mocks.prisma.author.findMany.mockResolvedValue([
      { slug: "lev-tolstoy", updatedAt: new Date("2026-09-01") },
    ]);
  });

  it("включает /authors/{slug} для автора со slug", async () => {
    const xml = await generateSitemap();
    expect(xml).toContain("https://bookstrata.ru/authors/lev-tolstoy");
  });

  it("включает страницу списка /authors", async () => {
    const xml = await generateSitemap();
    expect(xml).toContain("<loc>https://bookstrata.ru/authors</loc>");
  });

  it("фильтрует по slug != null (без условия на seoDescription)", async () => {
    await generateSitemap();
    expect(mocks.prisma.author.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: { not: null } },
        select: { slug: true, updatedAt: true },
      }),
    );
  });

  it("без авторов — /authors/ в sitemap нет", async () => {
    mocks.prisma.author.findMany.mockResolvedValue([]);
    const xml = await generateSitemap();
    expect(xml).not.toContain("/authors/");
  });

  it("авторский URL имеет priority и changefreq", async () => {
    const xml = await generateSitemap();
    const block = xml
      .split("<url>")
      .find((s) => s.includes("/authors/lev-tolstoy"));
    expect(block).toBeDefined();
    expect(block).toContain("<priority>0.7</priority>");
    expect(block).toContain("<changefreq>weekly</changefreq>");
    expect(block).toContain(
      "<lastmod>2026-09-01</lastmod>",
    );
  });
});

import { describe, it, expect, vi } from "vitest";
import { createHash } from "node:crypto";
import {
  isOrphanKey,
  buildUsedImageCacheKeys,
  collectUsedUrls,
  urlsForKey,
} from "./cleanup-orphaned-files.js";

describe("cleanup-orphaned-files", () => {
  describe("buildUsedImageCacheKeys", () => {
    it("создаёт ключ image-cache/<md5>.webp для внешних http/https URL", () => {
      const url = "https://books.google.com/books/content?id=test123";
      const expectedMd5 = createHash("md5").update(url).digest("hex");
      const usedUrls = new Set([url]);

      const cacheKeys = buildUsedImageCacheKeys(usedUrls);

      expect(cacheKeys.has(`image-cache/${expectedMd5}.webp`)).toBe(true);
    });

    it("игнорирует не-URL строки", () => {
      const usedUrls = new Set(["/uploads/local.webp", "relative/path.png"]);
      const cacheKeys = buildUsedImageCacheKeys(usedUrls);

      expect(cacheKeys.size).toBe(0);
    });
  });

  describe("urlsForKey", () => {
    it("генерирует все варианты URL для ключа", () => {
      const key = "tiermaker-pro/author-heroes/author1.webp";
      const urls = urlsForKey(key, "bookstrata");

      expect(urls).toContain(key);
      expect(urls).toContain(`/${key}`);
      expect(urls.some((u) => u.endsWith(key))).toBe(true);
    });
  });

  describe("isOrphanKey", () => {
    it("защищает author-heroes, если URL автора есть в базе", () => {
      const key = "tiermaker-pro/author-heroes/stephen-king.webp";
      const fullUrl = `https://bookstrata.ru/img/${key}`;
      const usedUrls = new Set([fullUrl]);
      const usedCacheKeys = new Set<string>();

      expect(isOrphanKey(key, usedUrls, usedCacheKeys, "bookstrata")).toBe(false);
    });

    it("защищает image-cache, если MD5 хэш внешнего URL книги есть в usedCacheKeys", () => {
      const externalUrl = "https://books.google.com/books/content?id=xyz";
      const md5 = createHash("md5").update(externalUrl).digest("hex");
      const key = `image-cache/${md5}.webp`;

      const usedUrls = new Set([externalUrl]);
      const usedCacheKeys = buildUsedImageCacheKeys(usedUrls);

      expect(isOrphanKey(key, usedUrls, usedCacheKeys, "bookstrata")).toBe(false);
    });

    it("считает сиротой ключ, которого нет ни в базе, ни в кэше", () => {
      const key = "tiermaker-pro/book-covers/deleted-forever.webp";
      const usedUrls = new Set(["https://bookstrata.ru/img/tiermaker-pro/book-covers/other.webp"]);
      const usedCacheKeys = new Set<string>();

      expect(isOrphanKey(key, usedUrls, usedCacheKeys, "bookstrata")).toBe(true);
    });
  });

  describe("collectUsedUrls", () => {
    it("собирает URL из Author, Book (включая ogImageUrl), Achievement и остальных моделей", async () => {
      const mockPrisma = {
        book: {
          findMany: vi.fn().mockResolvedValue([
            {
              coverImageUrl: "https://bookstrata.ru/img/book1.webp",
              ogImageUrl: "https://bookstrata.ru/img/book1-og.webp",
              animatedCoverUrl: "https://bookstrata.ru/img/book1.mp4",
            },
          ]),
        },
        author: {
          findMany: vi.fn().mockResolvedValue([
            { heroImageUrl: "https://bookstrata.ru/img/tiermaker-pro/author-heroes/tolstoy.webp" },
          ]),
        },
        collection: {
          findMany: vi.fn().mockResolvedValue([
            {
              coverImageUrl: "https://bookstrata.ru/img/col1.webp",
              bookCovers: ["https://bookstrata.ru/img/col-book1.webp"],
              books: [{ coverImageUrl: "https://bookstrata.ru/img/col-json-book.webp" }],
              tiers: [],
            },
          ]),
        },
        celebrity: {
          findMany: vi.fn().mockResolvedValue([
            { photoUrl: "https://bookstrata.ru/img/celeb1.webp", books: [], tiers: [] },
          ]),
        },
        tierList: {
          findMany: vi.fn().mockResolvedValue([
            { coverImageUrl: "https://bookstrata.ru/img/tier1.webp" },
          ]),
        },
        bookPlacement: {
          findMany: vi.fn().mockResolvedValue([
            { coverImageUrl: "https://bookstrata.ru/img/placement1.webp" },
          ]),
        },
        newsArticle: {
          findMany: vi.fn().mockResolvedValue([
            { imageUrl: "https://bookstrata.ru/img/news1.webp" },
          ]),
        },
        user: {
          findMany: vi.fn().mockResolvedValue([
            { avatarUrl: "https://bookstrata.ru/img/avatar1.webp" },
          ]),
        },
        contentFlag: {
          findMany: vi.fn().mockResolvedValue([
            { imageUrl: "https://bookstrata.ru/img/flag1.webp" },
          ]),
        },
        template: {
          findMany: vi.fn().mockResolvedValue([
            { defaultBooks: [{ coverImageUrl: "https://bookstrata.ru/img/tpl-book.webp" }] },
          ]),
        },
        achievement: {
          findMany: vi.fn().mockResolvedValue([
            { iconUrl: "https://bookstrata.ru/img/achieve1.webp" },
          ]),
        },
      };

      const urls = await collectUsedUrls(mockPrisma as any);

      // Проверяем ключевые поля, которые ранее были пропущены
      expect(urls.has("https://bookstrata.ru/img/tiermaker-pro/author-heroes/tolstoy.webp")).toBe(true);
      expect(urls.has("https://bookstrata.ru/img/book1-og.webp")).toBe(true);
      expect(urls.has("https://bookstrata.ru/img/achieve1.webp")).toBe(true);

      // Проверяем остальные модели
      expect(urls.has("https://bookstrata.ru/img/book1.webp")).toBe(true);
      expect(urls.has("https://bookstrata.ru/img/col1.webp")).toBe(true);
      expect(urls.has("https://bookstrata.ru/img/col-json-book.webp")).toBe(true);
      expect(urls.has("https://bookstrata.ru/img/avatar1.webp")).toBe(true);
    });
  });
});

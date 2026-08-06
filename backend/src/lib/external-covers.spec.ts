import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  migrateUrlToCdn,
  migrateBookCovers,
  migrateUrlsArray,
} from "./external-covers.js";

// Мокируем модуль proxy, чтобы не ходить в сеть/S3 в юнит-тестах
vi.mock("../modules/image-proxy/image-proxy.service.js", () => ({
  externalToCdnUrl: vi.fn(async (url: string) => {
    if (url.startsWith("https://external.example")) {
      return "https://cdn.example.com/image-cache/abc.webp";
    }
    if (url.includes("broken")) return null;
    // Свои/локальные URL — возвращаются как есть
    return url;
  }),
}));

import { externalToCdnUrl } from "../modules/image-proxy/image-proxy.service.js";

const mockExternalToCdnUrl = vi.mocked(externalToCdnUrl);

describe("external-covers", () => {
  beforeEach(() => {
    mockExternalToCdnUrl.mockClear();
  });

  describe("migrateUrlToCdn", () => {
    it("переводит внешний URL на наш CDN", async () => {
      const result = await migrateUrlToCdn("https://external.example/cover.jpg");
      expect(result).toBe("https://cdn.example.com/image-cache/abc.webp");
      expect(mockExternalToCdnUrl).toHaveBeenCalledTimes(1);
    });

    it("при ошибке конвертации возвращает исходный URL (не ломает сохранение)", async () => {
      const result = await migrateUrlToCdn("https://broken.example/x.jpg");
      expect(result).toBe("https://broken.example/x.jpg");
    });
  });

  describe("migrateBookCovers", () => {
    it("меняет обложки внешних книг и возвращает НОВЫЙ объект (исходный не мутирует)", async () => {
      const books = {
        a: { id: "a", title: "Книга 1", coverImageUrl: "https://external.example/a.jpg" },
        b: { id: "b", title: "Книга 2", coverImageUrl: "/local.jpg" },
      } as const;

      const result = await migrateBookCovers(books as never);

      expect(result.a?.coverImageUrl).toBe("https://cdn.example.com/image-cache/abc.webp");
      expect(result.b?.coverImageUrl).toBe("/local.jpg");
      // исходный объект не мутирован
      expect(books.a?.coverImageUrl).toBe("https://external.example/a.jpg");
    });

    it("не вызывает прокси для книг без обложки", async () => {
      const books = {
        a: { id: "a", title: "no cover" },
      } as never;
      const result = await migrateBookCovers(books as never);
      expect(result.a?.coverImageUrl).toBeUndefined();
      expect(mockExternalToCdnUrl).not.toHaveBeenCalled();
    });
  });

  describe("migrateUrlsArray", () => {
    it("прогоняет каждый URL через миграцию", async () => {
      const result = await migrateUrlsArray([
        "https://external.example/1.jpg",
        "https://external.example/2.jpg",
      ]);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe("https://cdn.example.com/image-cache/abc.webp");
      expect(mockExternalToCdnUrl).toHaveBeenCalledTimes(2);
    });

    it("пустой массив — без вызовов", async () => {
      const result = await migrateUrlsArray([]);
      expect(result).toEqual([]);
      expect(mockExternalToCdnUrl).not.toHaveBeenCalled();
    });
  });
});
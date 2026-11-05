// src/utils/animatedCover.spec.ts
import { describe, it, expect } from "vitest";
import { parseAnimatedCoverUrl, formatAnimatedCoverUrl } from "./animatedCover";

describe("animatedCover utils", () => {
  describe("parseAnimatedCoverUrl", () => {
    it("обрабатывает пустые значения и null", () => {
      expect(parseAnimatedCoverUrl(null)).toEqual({
        cleanUrl: "",
        positionY: 50,
        objectPosition: "center 50%",
      });
      expect(parseAnimatedCoverUrl("")).toEqual({
        cleanUrl: "",
        positionY: 50,
        objectPosition: "center 50%",
      });
    });

    it("возвращает дефолтное смещение 50% для обычного URL", () => {
      const res = parseAnimatedCoverUrl("https://cdn.bookstrata.ru/video.mp4");
      expect(res.cleanUrl).toBe("https://cdn.bookstrata.ru/video.mp4");
      expect(res.positionY).toBe(50);
      expect(res.objectPosition).toBe("center 50%");
    });

    it("корректно парсит #pos=80", () => {
      const res = parseAnimatedCoverUrl("https://cdn.bookstrata.ru/video.mp4#pos=80");
      expect(res.cleanUrl).toBe("https://cdn.bookstrata.ru/video.mp4");
      expect(res.positionY).toBe(80);
      expect(res.objectPosition).toBe("center 80%");
    });

    it("корректно парсит ?pos=25", () => {
      const res = parseAnimatedCoverUrl("https://cdn.bookstrata.ru/video.mp4?pos=25");
      expect(res.cleanUrl).toBe("https://cdn.bookstrata.ru/video.mp4");
      expect(res.positionY).toBe(25);
      expect(res.objectPosition).toBe("center 25%");
    });

    it("ограничивает значения в диапазоне 0..100", () => {
      expect(parseAnimatedCoverUrl("https://cdn.../v.mp4#pos=150").positionY).toBe(100);
      expect(parseAnimatedCoverUrl("https://cdn.../v.mp4#pos=-20").positionY).toBe(50); // отрицательные не матчатся \d
    });
  });

  describe("formatAnimatedCoverUrl", () => {
    it("не добавляет суффикс при 50% (дефолт)", () => {
      expect(formatAnimatedCoverUrl("https://cdn.bookstrata.ru/video.mp4", 50)).toBe(
        "https://cdn.bookstrata.ru/video.mp4",
      );
    });

    it("добавляет #pos=число при отличии от 50%", () => {
      expect(formatAnimatedCoverUrl("https://cdn.bookstrata.ru/video.mp4", 85)).toBe(
        "https://cdn.bookstrata.ru/video.mp4#pos=85",
      );
      expect(formatAnimatedCoverUrl("https://cdn.bookstrata.ru/video.mp4", 0)).toBe(
        "https://cdn.bookstrata.ru/video.mp4#pos=0",
      );
    });

    it("корректно обновляет существующий суффикс", () => {
      expect(formatAnimatedCoverUrl("https://cdn.bookstrata.ru/video.mp4#pos=80", 30)).toBe(
        "https://cdn.bookstrata.ru/video.mp4#pos=30",
      );
      expect(formatAnimatedCoverUrl("https://cdn.bookstrata.ru/video.mp4#pos=80", 50)).toBe(
        "https://cdn.bookstrata.ru/video.mp4",
      );
    });
  });
});

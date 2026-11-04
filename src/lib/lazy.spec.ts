import { describe, it, expect } from "vitest";
import {
  isChunkLoadError,
  addCacheBustParam,
  removeCacheBustParam,
} from "./lazy";

describe("isChunkLoadError", () => {
  it("распознаёт ошибки загрузки ESM модулей в Vite", () => {
    const err = new TypeError("Failed to fetch dynamically imported module: /assets/Page.js");
    expect(isChunkLoadError(err)).toBe(true);
  });

  it("распознаёт Importing a module script failed", () => {
    const err = new TypeError("Importing a module script failed.");
    expect(isChunkLoadError(err)).toBe(true);
  });

  it("не реагирует на обычные ошибки", () => {
    const err = new Error("Network request failed");
    expect(isChunkLoadError(err)).toBe(false);
  });
});

describe("addCacheBustParam", () => {
  it("добавляет параметр ?__bust=<timestamp> к чистому URL", () => {
    const result = addCacheBustParam("https://bookstrata.ru/", 12345);
    expect(result).toBe("https://bookstrata.ru/?__bust=12345");
  });

  it("добавляет параметр к URL с существующими query-параметрами", () => {
    const result = addCacheBustParam("https://bookstrata.ru/community?category=historical", 12345);
    expect(result).toBe("https://bookstrata.ru/community?category=historical&__bust=12345");
  });

  it("не дублирует __bust, а заменяет старое значение", () => {
    const result = addCacheBustParam("https://bookstrata.ru/?__bust=111", 222);
    expect(result).toBe("https://bookstrata.ru/?__bust=222");
    expect(result).not.toContain("&__bust=111");
  });

  it("очищает множественные дубликаты __bust, оставляя только один", () => {
    const result = addCacheBustParam(
      "https://bookstrata.ru/?__bust=1782777600080&__bust=1784937600163",
      99999,
    );
    expect(result).toBe("https://bookstrata.ru/?__bust=99999");
  });

  it("сохраняет hash", () => {
    const result = addCacheBustParam("https://bookstrata.ru/tier-lists/top#section-1", 12345);
    expect(result).toBe("https://bookstrata.ru/tier-lists/top?__bust=12345#section-1");
  });
});

describe("removeCacheBustParam", () => {
  it("удаляет __bust из URL, оставляя чистый путь", () => {
    const result = removeCacheBustParam("https://bookstrata.ru/?__bust=1782777600080");
    expect(result).toBe("https://bookstrata.ru/");
  });

  it("удаляет множественные дубликаты __bust", () => {
    const result = removeCacheBustParam(
      "https://bookstrata.ru/?__bust=1782777600080&__bust=1784937600163",
    );
    expect(result).toBe("https://bookstrata.ru/");
  });

  it("сохраняет остальные параметры и hash", () => {
    const result = removeCacheBustParam(
      "https://bookstrata.ru/community?category=historical&__bust=1782777600080#discussions",
    );
    expect(result).toBe("https://bookstrata.ru/community?category=historical#discussions");
  });

  it("не изменяет URL, если __bust отсутствует", () => {
    const url = "https://bookstrata.ru/community?category=historical";
    expect(removeCacheBustParam(url)).toBe(url);
  });
});

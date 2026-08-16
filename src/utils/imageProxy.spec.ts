// src/utils/imageProxy.spec.ts
// proxyImageUrl: S3 → CDN, внешние обложки → WebP-прокси, локальные — как есть,
// относительные пути без слэша — нормализация (защита от 404 на /collections/...).
import { describe, it, expect } from "vitest";
import { proxyImageUrl } from "./imageProxy";

describe("proxyImageUrl", () => {
  it("S3 заменяется на CDN", () => {
    expect(
      proxyImageUrl("https://s3.twcstorage.ru/bookstrata/tiermaker-pro/x.webp"),
    ).toBe("https://re406cj9uj.cdn.twcstorage.ru/tiermaker-pro/x.webp");
  });

  it("локальный путь со слэшем не меняется", () => {
    expect(proxyImageUrl("/images/templates/detectiv.webp")).toBe(
      "/images/templates/detectiv.webp",
    );
  });

  it("относительный путь без слэша нормализуется (битые данные в БД)", () => {
    expect(proxyImageUrl("images/templates/detectiv.webp")).toBe(
      "/images/templates/detectiv.webp",
    );
  });

  it("внешний URL из списка проксируется через /api/images/proxy", () => {
    const proxied = proxyImageUrl("https://i.gr-assets.com/images/x.jpg");
    expect(proxied).toMatch(/^\/api\/images\/proxy\?url=/);
    expect(proxied).toContain(encodeURIComponent("https://i.gr-assets.com/images/x.jpg"));
  });

  it("data: URL не трогается", () => {
    expect(proxyImageUrl("data:image/png;base64,AAAA")).toBe(
      "data:image/png;base64,AAAA",
    );
  });

  it("полный https URL не получает ведущий слэш", () => {
    expect(proxyImageUrl("https://example.com/cover.jpg")).toBe(
      "https://example.com/cover.jpg",
    );
  });

  it("пустая строка/null возвращает пустую строку", () => {
    expect(proxyImageUrl(null)).toBe("");
    expect(proxyImageUrl(undefined)).toBe("");
  });
});
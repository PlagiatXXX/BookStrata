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

  it("fantlab и mnogobookaf проксируются через /api/images/proxy", () => {
    const fantlab = proxyImageUrl("https://fantlab.ru/images/editions/orig/227824?r=1530008358");
    expect(fantlab).toMatch(/^\/api\/images\/proxy\?url=/);
    expect(fantlab).toContain(encodeURIComponent("https://fantlab.ru/images/editions/orig/227824?r=1530008358"));

    const mnogobookaf = proxyImageUrl("https://mnogobookaf.ru/images/thumbnails/960/1572/detailed/34/123841.jpg");
    expect(mnogobookaf).toMatch(/^\/api\/images\/proxy\?url=/);
  });

  it("openlibrary, google books и wikimedia проксируются через /api/images/proxy", () => {
    const openlibrary = proxyImageUrl("https://covers.openlibrary.org/b/id/123-L.jpg");
    expect(openlibrary).toMatch(/^\/api\/images\/proxy\?url=/);

    const google = proxyImageUrl("https://books.google.com/books/content?id=abc&printsec=frontcover");
    expect(google).toMatch(/^\/api\/images\/proxy\?url=/);

    const wiki = proxyImageUrl("https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Example.jpg");
    expect(wiki).toMatch(/^\/api\/images\/proxy\?url=/);
  });

  it("corpus, irecommend и moscowbooks проксируются через /api/images/proxy", () => {
    const corpus = proxyImageUrl("https://www.corpus.ru/picts/products/Dicker-Pravda-1000.jpg");
    expect(corpus).toMatch(/^\/api\/images\/proxy\?url=/);

    const irecommend = proxyImageUrl("https://irecommend.ru/sites/default/files/product-images/44881/2324078_36867_3524218_368225.jpg");
    expect(irecommend).toMatch(/^\/api\/images\/proxy\?url=/);

    const moscowbooks = proxyImageUrl("https://www.moscowbooks.ru/image/book/792/orig/i792245.jpg?cu=20231011161520");
    expect(moscowbooks).toMatch(/^\/api\/images\/proxy\?url=/);
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
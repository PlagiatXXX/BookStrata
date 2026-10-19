// backend/src/lib/media-url-rewrite.spec.ts
// Переписывание URL медиа на собственный домен: нужно для разовой миграции
// старых URL (raw-S3, CDN) в БД после отказа от CDN.
import { describe, it, expect, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  config: { MEDIA_PUBLIC_URL: "https://bookstrata.ru/img" },
}));

import { rewriteMediaUrl, rewriteMediaUrlsInJson } from "./media-url-rewrite.js";

describe("rewriteMediaUrl", () => {
  it("переписывает S3-URL", () => {
    expect(rewriteMediaUrl("https://s3.twcstorage.ru/bookstrata/a/b.webp")).toBe(
      "https://bookstrata.ru/img/a/b.webp",
    );
  });

  it("переписывает CDN-URL", () => {
    expect(rewriteMediaUrl("https://re406cj9uj.cdn.twcstorage.ru/a/b.webp")).toBe(
      "https://bookstrata.ru/img/a/b.webp",
    );
  });

  it("внешние и новые URL не трогает", () => {
    expect(rewriteMediaUrl("https://m.media-amazon.com/x.jpg")).toBe(
      "https://m.media-amazon.com/x.jpg",
    );
    expect(rewriteMediaUrl("https://bookstrata.ru/img/a/b.webp")).toBe(
      "https://bookstrata.ru/img/a/b.webp",
    );
  });

  it("локальные пути, пустые строки и текст с URL внутри не трогает", () => {
    expect(rewriteMediaUrl("/images/templates/detectiv.webp")).toBe(
      "/images/templates/detectiv.webp",
    );
    expect(rewriteMediaUrl("")).toBe("");
    // строка с URL внутри — это текст (описание), а не ссылка
    expect(rewriteMediaUrl("https://s3.twcstorage.ru/bookstrata/a.webp и подпись")).toBe(
      "https://s3.twcstorage.ru/bookstrata/a.webp и подпись",
    );
  });
});

describe("rewriteMediaUrlsInJson", () => {
  it("переписывает URL во вложенных объектах и массивах, считая изменения", () => {
    const input = {
      a: { coverImageUrl: "https://s3.twcstorage.ru/bookstrata/x.webp", title: "Книга" },
      list: [
        "https://re406cj9uj.cdn.twcstorage.ru/y.webp",
        "https://m.media-amazon.com/z.jpg",
      ],
    };

    const [out, changed] = rewriteMediaUrlsInJson(input);

    expect(changed).toBe(2);
    expect(out).toEqual({
      a: { coverImageUrl: "https://bookstrata.ru/img/x.webp", title: "Книга" },
      list: [
        "https://bookstrata.ru/img/y.webp",
        "https://m.media-amazon.com/z.jpg",
      ],
    });
  });

  it("без изменений возвращает исходное значение и 0", () => {
    const input = { title: "Просто текст", n: 5, b: true, u: "https://m.media-amazon.com/x.jpg" };

    const [out, changed] = rewriteMediaUrlsInJson(input);

    expect(changed).toBe(0);
    expect(out).toEqual(input);
  });

  it("не меняет примитивы вне объекта", () => {
    expect(rewriteMediaUrlsInJson(null)).toEqual([null, 0]);
    expect(rewriteMediaUrlsInJson(42)).toEqual([42, 0]);
  });
});

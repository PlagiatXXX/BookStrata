import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildPayload,
  chunkUrls,
  main,
  parseSitemap,
  pingIndexNow,
  selectChangedUrls,
} from "./indexnow-ping.mjs";

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bookstrata.ru/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://bookstrata.ru/books/dostoevsky-idiot</loc>
    <lastmod>2026-08-20</lastmod>
  </url>
  <url>
    <loc>https://bookstrata.ru/collections/horror-books</loc>
    <lastmod>2026-08-25</lastmod>
  </url>
</urlset>`;

describe("parseSitemap", () => {
  it("извлекает URL, хост и lastmod", () => {
    const { host, lastmod } = parseSitemap(SITEMAP_XML);

    expect(host).toBe("bookstrata.ru");
    expect(lastmod["https://bookstrata.ru/"]).toBeUndefined();
    expect(lastmod["https://bookstrata.ru/books/dostoevsky-idiot"]).toBe("2026-08-20");
    expect(Object.keys(lastmod)).toHaveLength(3);
  });
});

describe("selectChangedUrls", () => {
  const current = {
    "https://bookstrata.ru/a": "2026-01-01",
    "https://bookstrata.ru/b": "2026-02-02",
    "https://bookstrata.ru/c": undefined,
  };

  it("первый запуск (нет состояния) — возвращает все URL", () => {
    expect(selectChangedUrls(current, null)).toHaveLength(3);
  });

  it("возвращает новые и изменившиеся URL", () => {
    const prev = {
      sentAt: "2026-01-01T00:00:00Z",
      lastmod: {
        "https://bookstrata.ru/a": "2025-12-01", // изменился
        "https://bookstrata.ru/c": undefined,     // не изменился
        "https://bookstrata.ru/deleted": "2025-01-01", // исчез — не пингуем
      },
    };

    expect(selectChangedUrls(current, prev)).toEqual([
      "https://bookstrata.ru/a", // изменился
      "https://bookstrata.ru/b", // новый
    ]);
  });

  it("ничего не возвращает, если ничего не поменялось", () => {
    const prev = { sentAt: "x", lastmod: current };
    expect(selectChangedUrls(current, prev)).toEqual([]);
  });
});

describe("chunkUrls / buildPayload", () => {
  it("режет список на части по лимиту IndexNow (10k)", () => {
    const urls = Array.from({ length: 10001 }, (_, i) => `https://bookstrata.ru/${i}`);
    const chunks = chunkUrls(urls, 10000);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(10000);
    expect(chunks[1]).toHaveLength(1);
  });

  it("собирает корректный payload", () => {
    expect(buildPayload("bookstrata.ru", "KEY", ["https://bookstrata.ru/"])).toEqual({
      host: "bookstrata.ru",
      key: "KEY",
      urlList: ["https://bookstrata.ru/"],
    });
  });
});

describe("pingIndexNow", () => {
  it("успех при 200/202", async () => {
    const ok = await pingIndexNow({ host: "h", key: "k", urlList: ["u"] }, async () => ({ status: 200 }));
    const accepted = await pingIndexNow({ host: "h", key: "k", urlList: [] }, async () => ({ status: 202 }));
    expect(ok.ok).toBe(true);
    expect(accepted.ok).toBe(true);
  });

  it("ошибка при отказе API (403)", async () => {
    const res = await pingIndexNow({ host: "h", key: "bad", urlList: ["u"] }, async () => ({ status: 403 }));
    expect(res.ok).toBe(false);
  });

  it("пробрасывает ошибку сети", async () => {
    const res = await pingIndexNow({ host: "h", key: "k", urlList: [] }, async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(res.ok).toBe(false);
  });
});

describe("main (интеграционный сценарий с файлами)", () => {
  it("первый запуск пингует все URL и сохраняет состояние; повторный без изменений — не пингует", async () => {
    const dir = mkdtempSync(join(tmpdir(), "indexnow-"));
    try {
      const sitemapPath = join(dir, "sitemap.xml");
      const statePath = join(dir, "state.json");
      writeFileSync(sitemapPath, SITEMAP_XML);

      const calls = [];
      const fakeFetch = async (url, init) => {
        calls.push({ url: String(url), body: JSON.parse(init.body) });
        return { status: 200 };
      };

      const code1 = await main([
        "--sitemap", sitemapPath,
        "--state", statePath,
        "--key", "TESTKEY",
        "--endpoint", "https://api.indexnow.org/indexnow",
      ], fakeFetch);
      expect(code1).toBe(0);
      expect(calls).toHaveLength(1);
      expect(calls[0].body.urlList).toHaveLength(3);

      // состояние записано
      const state = JSON.parse(readFileSync(statePath, "utf8"));
      expect(state.lastmod["https://bookstrata.ru/books/dostoevsky-idiot"]).toBe("2026-08-20");

      // второй запуск: ничего не изменилось → пингов нет
      calls.length = 0;
      const code2 = await main([
        "--sitemap", sitemapPath,
        "--state", statePath,
        "--key", "TESTKEY",
        "--endpoint", "https://api.indexnow.org/indexnow",
      ], fakeFetch);
      expect(code2).toBe(0);
      expect(calls).toHaveLength(0);

      // изменился lastmod у одной страницы → пингуется только она
      writeFileSync(sitemapPath, SITEMAP_XML.replace("2026-08-20", "2026-08-26"));
      calls.length = 0;
      const code3 = await main([
        "--sitemap", sitemapPath,
        "--state", statePath,
        "--key", "TESTKEY",
        "--endpoint", "https://api.indexnow.org/indexnow",
      ], fakeFetch);
      expect(code3).toBe(0);
      expect(calls[0].body.urlList).toEqual(["https://bookstrata.ru/books/dostoevsky-idiot"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("при отказе API состояние НЕ сохраняется и код ненулевой", async () => {
    const dir = mkdtempSync(join(tmpdir(), "indexnow-"));
    try {
      const sitemapPath = join(dir, "sitemap.xml");
      const statePath = join(dir, "state.json");
      writeFileSync(sitemapPath, SITEMAP_XML);

      const code = await main([
        "--sitemap", sitemapPath,
        "--state", statePath,
        "--key", "BADKEY",
      ], async () => ({ status: 403 }));

      expect(code).not.toBe(0);
      expect(() => readFileSync(statePath)).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("битый sitemap → код ненулевой, без исключения наверх", async () => {
    const dir = mkdtempSync(join(tmpdir(), "indexnow-"));
    try {
      const sitemapPath = join(dir, "sitemap.xml");
      writeFileSync(sitemapPath, "<urlset><url></urlset>");
      const code = await main([
        "--sitemap", sitemapPath,
        "--state", join(dir, "state.json"),
        "--key", "K",
      ], async () => ({ status: 200 }));
      expect(code).not.toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

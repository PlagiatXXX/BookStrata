import { describe, expect, it } from "vitest";

// escapeHtml экспортируется из prerender.mjs для тестирования
// (импорт файла не запускает prerender: main() вызывается только напрямую)
import { escapeHtml, filterRoutes, parseOnlyArgs } from "./prerender.mjs";

describe("escapeHtml (prerender fallback XSS-гвард)", () => {
  it("экранирует HTML-инъекцию в заголовке тир-листа", () => {
    const malicious = `<img src=x onerror=alert(1)>`;
    expect(escapeHtml(malicious)).toBe(
      "&lt;img src=x onerror=alert(1)&gt;",
    );
  });

  it("экранирует script-тег", () => {
    expect(escapeHtml(`<script>alert("xss")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
    );
  });

  it("экранирует кавычки и амперсанд (атрибуты)", () => {
    expect(escapeHtml(`a "b" & 'c'`)).toBe("a &quot;b&quot; &amp; &#39;c&#39;");
  });

  it("не трогает обычный русский текст", () => {
    expect(escapeHtml("Мои любимые книги")).toBe("Мои любимые книги");
  });

  it("null/undefined → пустая строка (не падает на отсутствующих полях)", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});

describe("filterRoutes (CLI --only)", () => {
  const routes = [
    { path: "/", name: "Главная" },
    { path: "/authors/agata-kristi", name: "Агата Кристи" },
    { path: "/books/foo", name: "Foo" },
  ];

  it("без only (undefined) → все роуты", () => {
    expect(filterRoutes(routes, undefined)).toEqual(routes);
  });

  it("пустой массив → все роуты", () => {
    expect(filterRoutes(routes, [])).toEqual(routes);
  });

  it("один путь → только он", () => {
    expect(filterRoutes(routes, ["/books/foo"])).toEqual([
      { path: "/books/foo", name: "Foo" },
    ]);
  });

  it("несколько путей → только они", () => {
    expect(
      filterRoutes(routes, ["/", "/authors/agata-kristi"]).map((r) => r.path),
    ).toEqual(["/", "/authors/agata-kristi"]);
  });

  it("ни одного совпадения → пустой массив", () => {
    expect(filterRoutes(routes, ["/nope"])).toEqual([]);
  });

  it("не мутирует входной массив", () => {
    const copy = JSON.parse(JSON.stringify(routes));
    filterRoutes(routes, ["/"]);
    expect(routes).toEqual(copy);
  });
});

describe("parseOnlyArgs (CLI --only)", () => {
  it("без флага → пустой массив", () => {
    expect(parseOnlyArgs(["node", "prerender.mjs"])).toEqual([]);
  });

  it("один --only", () => {
    expect(
      parseOnlyArgs(["node", "prerender.mjs", "--only", "/authors/x"]),
    ).toEqual(["/authors/x"]);
  });

  it("несколько --only (повторяемый флаг)", () => {
    expect(
      parseOnlyArgs([
        "node",
        "prerender.mjs",
        "--only",
        "/a",
        "--only",
        "/b",
      ]),
    ).toEqual(["/a", "/b"]);
  });

  it("--only без значения → ошибка", () => {
    expect(() => parseOnlyArgs(["node", "prerender.mjs", "--only"])).toThrow(
      "--only",
    );
  });
});

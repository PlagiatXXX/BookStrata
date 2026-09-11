import { describe, expect, it } from "vitest";

// escapeHtml экспортируется из prerender.mjs для тестирования
// (импорт файла не запускает prerender: main() вызывается только напрямую)
import { escapeHtml } from "./prerender.mjs";

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

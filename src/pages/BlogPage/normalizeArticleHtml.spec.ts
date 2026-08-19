// src/pages/BlogPage/normalizeArticleHtml.spec.ts
// Контент статей пишется в WYSIWYG, где возможен H1 — он дублирует H1 страницы
// (h1_multiple). При рендере контентные H1 понижаются до H2.
import { describe, it, expect } from "vitest";
import { normalizeArticleHtml } from "./normalizeArticleHtml";

describe("normalizeArticleHtml", () => {
  it("превращает контентный H1 в H2", () => {
    expect(normalizeArticleHtml("<h1>Заголовок</h1><p>Текст</p>")).toBe(
      "<h2>Заголовок</h2><p>Текст</p>",
    );
  });

  it("сохраняет атрибуты тега при понижении уровня", () => {
    expect(normalizeArticleHtml('<h1 class="big" id="a">Заголовок</h1>')).toBe(
      '<h2 class="big" id="a">Заголовок</h2>',
    );
  });

  it("не трогает H2 и ниже", () => {
    const html = "<h2>Раздел</h2><h3>Подраздел</h3><h4>Деталь</h4>";
    expect(normalizeArticleHtml(html)).toBe(html);
  });

  it("пустой или null-контент возвращает как есть", () => {
    expect(normalizeArticleHtml("")).toBe("");
    expect(normalizeArticleHtml("<p>Только абзац</p>")).toBe("<p>Только абзац</p>");
  });

  it("не ломает вложенные H1 внутри code-блоков (текст как есть)", () => {
    const html = "<pre><code>&lt;h1&gt;пример&lt;/h1&gt;</code></pre>";
    expect(normalizeArticleHtml(html)).toBe(html);
  });
});
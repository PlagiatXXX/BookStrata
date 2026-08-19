// src/pages/BlogPage/normalizeArticleHtml.ts
// WYSIWYG-контент статей может содержать H1 (автор вставил заголовок в текст) —
// он дублирует H1 страницы (h1_multiple). При рендере контентные H1 понижаются
// до H2: семантика страницы остаётся с одним H1, а стили h2 уже есть в prose-custom.
export function normalizeArticleHtml(html: string): string {
  return html
    .replace(/<h1([^>]*)>/gi, "<h2$1>")
    .replace(/<\/h1>/gi, "</h2>");
}
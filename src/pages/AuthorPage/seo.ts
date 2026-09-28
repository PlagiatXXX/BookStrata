// src/pages/AuthorPage/seo.ts
// SEO-хелперы страницы автора /authors/:slug
// (паттерны: CollectionPage/seo.ts, BookPage/seo.ts)

const DEFAULT_DESCRIPTION =
  "Полная библиография, рейтинги книг и тир-листы автора на BookStrata — читайте, оценивайте, составляйте свои списки.";

/**
 * <title> страницы автора. Бренд «| BookStrata» добавит SEOHead
 * (hideSiteName не передаём — бренд в title страницам авторов нужен).
 */
export function buildAuthorSeoTitle(name: string): string {
  return `${name} — все книги: рейтинг и библиография`;
}

/**
 * meta description: первый абзац seoDescription, максимум 155 символов
 * с обрезкой по границе слова (как buildDescriptionSnippet на BookPage).
 */
export function buildAuthorDescription(seoDescription: string | null | undefined): string {
  if (!seoDescription) return DEFAULT_DESCRIPTION;
  const first = seoDescription.split(/\n+/)[0].replace(/\s+/g, " ").trim();
  if (!first) return DEFAULT_DESCRIPTION;
  if (first.length <= 155) return first;
  return first.slice(0, 155).replace(/\s+\S*$/, "") + "…";
}

// Person JSON-LD отдаёт готовый проп `person` в SEOHead
// (name + url + description, без aggregateRating — решение проекта).
// Свой buildAuthorJsonLd здесь не нужен — дублировал бы разметку.

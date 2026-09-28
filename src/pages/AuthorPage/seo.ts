// src/pages/AuthorPage/seo.ts
// SEO-хелперы страницы автора /authors/:slug
// (паттерны: CollectionPage/seo.ts, BookPage/seo.ts)

const SITE_URL = import.meta.env.VITE_SITE_URL || "https://bookstrata.ru";

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

/**
 * JSON-LD Person. aggregateRating намеренно НЕ размечаем —
 * как на BookPage: слабые/малооценённые рейтинги не должны попадать в выдачу.
 */
export function buildAuthorJsonLd(author: { name: string; slug: string }): Record<string, unknown> {
  const url = `${SITE_URL}/authors/${author.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    url,
    sameAs: [url],
  };
}

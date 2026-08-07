import { COLLECTION_SEO } from "@/data/collection-seo";

/** Обрезка текста до 155 символов по границе слова (лимит meta description). */
export function truncateDescription(text: string, max = 155): string {
  if (text.length <= max) return text;
  return text.slice(0, text.lastIndexOf(" ", max)) + "…";
}

/**
 * Формирует meta description страницы коллекции.
 *
 * Приоритет источников:
 * 1. Описание из админки (excerpt) — админ заполнил → отдаём его текст в выдачу;
 * 2. Шаблонный SEO-текст из collection-seo.ts — дефолт для коллекций без описания;
 * 3. Универсальный фолбэк с названием коллекции.
 */
export function buildCollectionSeoDesc(
  excerpt: string | null | undefined,
  slug: string,
  seoTitle: string,
): string {
  const fromAdmin = excerpt ? truncateDescription(excerpt) : null;
  if (fromAdmin) return fromAdmin;

  const fromTemplate = COLLECTION_SEO[slug];
  if (fromTemplate) return fromTemplate;

  return `Подборка "${seoTitle}" на BookStrata — лучшие книги по жанру, рейтинг и рекомендации читателей`;
}

/** SEO-заголовок: сначала данные из админки, затем читаемый заголовок из шаблона, затем slug. */
export function buildCollectionSeoTitle(
  title: string | null | undefined,
  slug: string,
  fallbackTitle: string,
): string {
  return title || fallbackTitle || slug || "";
}

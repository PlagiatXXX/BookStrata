// src/pages/BookPage/seo.ts
// Утилиты SEO для страницы книги: meta description и JSON-LD (Schema.org Book).
// Вынесены в отдельный файл — react-refresh запрещает экспорт не-компонентов
// из файлов компонентов.
import type { ReadingGuide } from "@/lib/bookApi";

/**
 * Meta description для страницы книги: первые ~155 символов описания
 * (по границе слова), fallback — шаблон, если описания нет.
 */
export function buildDescriptionSnippet(book: { title: string; author: string | null; description: string | null }): string {
  if (book.description) {
    const clean = book.description.replace(/\s+/g, " ").trim();
    if (clean.length <= 155) return clean;
    const cut = clean.slice(0, 155).trimEnd().replace(/\s\S*$/, "");
    return cut.length > 0 ? `${cut}…` : `${clean.slice(0, 155)}…`;
  }
  return `Книга ${book.title}${book.author ? ` ${book.author}` : ""}: описание, жанр, рейтинг. Найди книги в тир-листах и подборках BookStrata.`;
}

/**
 * JSON-LD (Schema.org Book) для страницы книги.
 * aggregateRating намеренно НЕ размечаем (решение 14.08): редакторский
 * рейтинг с ratingCount: 1 — риск спам-фильтра Google на все rich-результаты.
 * Рейтинг остаётся видимым на странице; вернём разметку с реальными голосами.
 *
 * AI-паспорт «Гид по чтению» (если заполнен) обогащает разметку ТОЛЬКО
 * честными полями Book (решение 08.09): disambiguatingDescription (хук) и
 * keywords (вайб/темп/сложность/тезисы) — все эти тексты реально видны на
 * странице в блоке «Гид по чтению». Синтетический Review сознательно
 * НЕ добавляем: сгенерированный ИИ «отзыв организации» — триггер
 * спам-фильтров поисковиков на все rich-результаты сайта.
 */
export function buildBookJsonLd(book: {
  title: string;
  author: string | null;
  coverImageUrl: string | null;
  description: string | null;
  genre: string | null;
  publishedYear: number | null;
  isbn: string | null;
  /** AI-паспорт «Гид по чтению» (Book.readingGuide), опционально */
  readingGuide?: ReadingGuide | null;
  /** Канонический URL страницы книги (для url и mainEntityOfPage) */
  url: string;
}): Record<string, unknown> {
  const guide = book.readingGuide ?? null;

  // Description: хук паспорта вперёд (уникальная суть), затем синопсис.
  // Хук и аудитория реально отображаются на странице — правила Schema.org
  // «разметка = видимый контент» соблюдены.
  const enrichedDescription =
    guide && guide.short_hook
      ? [guide.short_hook, book.description].filter(Boolean).join(" ")
      : book.description;

  const keywords = guide
    ? [guide.vibe, guide.reading_pace, guide.difficulty, book.genre, ...guide.key_takeaways]
        .filter(Boolean)
        .join(", ")
    : null;

  return {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    ...(book.author ? { author: { "@type": "Person", name: book.author } } : {}),
    ...(book.coverImageUrl ? { image: book.coverImageUrl } : {}),
    ...(enrichedDescription ? { description: enrichedDescription } : {}),
    ...(guide?.short_hook
      ? { disambiguatingDescription: guide.short_hook }
      : {}),
    ...(book.genre ? { genre: book.genre } : {}),
    ...(keywords ? { keywords } : {}),
    ...(book.publishedYear ? { datePublished: String(book.publishedYear) } : {}),
    ...(book.isbn ? { isbn: book.isbn } : {}),
    inLanguage: "ru",
    url: book.url,
    mainEntityOfPage: { "@type": "WebPage", "@id": book.url },
  };
}

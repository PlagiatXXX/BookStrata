// src/pages/BookPage/seo.ts
// Утилиты SEO для страницы книги: meta description и JSON-LD (Schema.org Book).
// Вынесены в отдельный файл — react-refresh запрещает экспорт не-компонентов
// из файлов компонентов.

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
 */
export function buildBookJsonLd(book: {
  title: string;
  author: string | null;
  coverImageUrl: string | null;
  description: string | null;
  genre: string | null;
  publishedYear: number | null;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    ...(book.author ? { author: { "@type": "Person", name: book.author } } : {}),
    ...(book.coverImageUrl ? { image: book.coverImageUrl } : {}),
    ...(book.description ? { description: book.description } : {}),
    ...(book.genre ? { genre: book.genre } : {}),
    ...(book.publishedYear ? { datePublished: String(book.publishedYear) } : {}),
  };
}

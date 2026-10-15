// src/pages/BookPage/seo.ts
// Утилиты SEO для страницы книги: meta description и JSON-LD (Schema.org Book).
// Вынесены в отдельный файл — react-refresh запрещает экспорт не-компонентов
// из файлов компонентов.
import type { ReadingGuide } from "@/lib/bookApi";

/** Лимит длины meta description страницы книги (влезает в сниппет выдачи). */
const DESCRIPTION_LIMIT = 160;

/** Входные данные для meta description страницы книги. */
export interface BookDescriptionInput {
  title: string;
  author: string | null;
  description: string | null;
  /** Редакторская оценка каталога 0–10 (Book.rating), опционально */
  rating?: number | null;
  /** Заполнен ли AI-паспорт «Гид по чтению» */
  hasReadingGuide?: boolean;
  /** Есть ли блок «Похожие книги» */
  hasSimilarBooks?: boolean;
  /** Сколько тир-листов содержит книгу */
  tierListsCount?: number;
}

/** Оценка редакции в тексте: целое — как есть, дробное — один знак с запятой. */
function formatEditorRating(rating: number): string {
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1).replace(".", ",");
}

/** Русский перечислительный список: «а, б, в и г». */
function joinRu(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} и ${parts[parts.length - 1]}`;
}

/**
 * Meta description страницы книги: «Название — Автор: <что есть на странице>. <описание>».
 *
 * Маркеры добавляются только по факту наличия данных (оценка/гид/тир-листы/похожие
 * книги), чтобы не обещать того, чего на странице нет. Слово «отзывы» намеренно
 * не используется: у книги их может не быть. Рейтинг называется «оценкой редакции»,
 * так как Book.rating — редакторская оценка, а не агрегат голосов читателей.
 *
 * Итог обрезается по границе слова до DESCRIPTION_LIMIT символов; при отсутствии
 * описания подставляется fallback-призыв.
 */
export function buildDescriptionSnippet(book: BookDescriptionInput): string {
  const base = book.author ? `${book.title} — ${book.author}` : book.title;

  const markers = ["о чём книга"];
  if (book.rating != null && book.rating > 0) {
    markers.push(`оценка редакции ${formatEditorRating(book.rating)} из 10`);
  }
  if (book.hasReadingGuide) markers.push("гид по чтению");
  if (book.tierListsCount && book.tierListsCount > 0) markers.push("тир-листы читателей");
  if (book.hasSimilarBooks) markers.push("похожие книги");

  const prefix = `${base}: ${joinRu(markers)}. `;

  const clean = book.description?.replace(/\s+/g, " ").trim() ?? "";
  const tail = clean || "Найди книги в тир-листах и подборках BookStrata.";

  const full = `${prefix}${tail}`;
  if (full.length <= DESCRIPTION_LIMIT) return full;

  // -1 символ под финальное многоточие
  const room = DESCRIPTION_LIMIT - prefix.length - 1;
  if (room < 10) {
    // Префикс почти исчерпал лимит — обрезаем его, описание не помещается
    return `${prefix.trimEnd().slice(0, DESCRIPTION_LIMIT - 1).trimEnd()}…`;
  }
  const cut = tail.slice(0, room).trimEnd().replace(/\s\S*$/, "");
  return cut.length > 0 ? `${prefix}${cut}…` : `${prefix.trimEnd()}…`;
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

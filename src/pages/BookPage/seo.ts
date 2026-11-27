// src/pages/BookPage/seo.ts
// Утилиты SEO для страницы книги: meta description и JSON-LD (Schema.org Book).
// Вынесены в отдельный файл — react-refresh запрещает экспорт не-компонентов
// из файлов компонентов.
import type { BookComment, ReadingGuide } from "@/lib/bookApi";

/** Лимит длины meta description страницы книги (влезает в сниппет выдачи). */
const DESCRIPTION_LIMIT = 160;

/** Входные данные для meta description страницы книги. */
export interface BookDescriptionInput {
  title: string;
  author: string | null;
  description: string | null;
  /** Краткий хук из AI-паспорта «Гид по чтению» (в приоритете над длинной аннотацией) */
  shortHook?: string | null;
  /** Редакторская оценка каталога 0–10 (Book.rating), опционально */
  rating?: number | null;
  /** Заполнен ли AI-паспорт «Гид по чтению» */
  hasReadingGuide?: boolean;
  /** Есть ли блок «Похожие книги» */
  hasSimilarBooks?: boolean;
  /** Сколько тир-листов содержит книгу */
  tierListsCount?: number;
  /** Количество комментариев/мыслей читателей */
  commentsCount?: number;
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
 * Meta description страницы книги:
 * «Название — Автор (оценка редакции X/10): <суть книги>. <маркеры разделов>».
 *
 * В приоритете — shortHook из «Гида по чтению» или начало аннотации, чтобы в первые
 * 160 символов попадала суть книги под запросы «о чём книга». Оценка редакции и
 * маркеры разделов добавляются только по факту наличия данных (слово «отзывы»
 * намеренно не используется), а хвост разделов подбирается по остатку места.
 */
export function buildDescriptionSnippet(book: BookDescriptionInput): string {
  const base = book.author ? `${book.title} — ${book.author}` : book.title;
  const ratingBadge =
    book.rating != null && book.rating > 0
      ? ` (оценка редакции ${formatEditorRating(book.rating)}/10)`
      : "";
  const prefix = `${base}${ratingBadge}: `;

  // -1 символ под финальное многоточие
  const room = DESCRIPTION_LIMIT - prefix.length - 1;
  if (room < 10) {
    // Префикс почти исчерпал лимит — обрезаем его, описание не помещается
    return `${prefix.trimEnd().slice(0, DESCRIPTION_LIMIT - 1).trimEnd()}…`;
  }

  const hook = book.shortHook?.replace(/\s+/g, " ").trim() ?? "";
  const clean = book.description?.replace(/\s+/g, " ").trim() ?? "";
  const summary = hook || clean || "Найди книги в тир-листах и подборках BookStrata.";

  if (prefix.length + summary.length > DESCRIPTION_LIMIT) {
    const cut = summary.slice(0, room).trimEnd().replace(/\s\S*$/, "");
    return cut.length > 0 ? `${prefix}${cut}…` : `${prefix.trimEnd()}…`;
  }

  const markers: string[] = [];
  if (book.hasReadingGuide) markers.push("гид по чтению");
  if (book.commentsCount && book.commentsCount > 0) markers.push("мысли читателей");
  if (book.tierListsCount && book.tierListsCount > 0) markers.push("тир-листы читателей");
  if (book.hasSimilarBooks) markers.push("похожие книги");

  if (markers.length === 0) {
    return `${prefix}${summary}`;
  }

  const summaryWithEnd = /[.!?…]$/.test(summary) ? summary : `${summary}.`;
  for (let count = markers.length; count >= 1; count--) {
    const joined = joinRu(markers.slice(0, count));
    const tailMarkers = `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`;
    const candidate = `${prefix}${summaryWithEnd} ${tailMarkers}`;
    if (candidate.length <= DESCRIPTION_LIMIT) {
      return candidate;
    }
  }

  return `${prefix}${summary}`;
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
  /** Комментарии / мысли читателей для микроразметки Schema.org Comment */
  comments?: BookComment[] | null;
  /** Ключевые персонажи книги для микроразметки Schema.org Person */
  characters?: Array<{ name: string }> | null;
}): Record<string, unknown> {
  const guide = book.readingGuide ?? null;

  const validChars = Array.from(
    new Set(
      (book.characters ?? [])
        .map((c) => c.name?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  );

  const activeComments = (book.comments ?? [])
    .filter((c) => !c.isDeleted && c.content?.trim())
    .slice(0, 10);

  const jsonLdComments =
    activeComments.length > 0
      ? activeComments.map((c) => ({
          "@type": "Comment",
          text: c.content,
          dateCreated: c.createdAt,
          upvoteCount: c.likesCount,
          author: {
            "@type": "Person",
            name: c.user.username,
          },
        }))
      : null;

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
    ...(jsonLdComments ? { comment: jsonLdComments } : {}),
    ...(validChars.length > 0
      ? { character: validChars.map((name) => ({ "@type": "Person", name })) }
      : {}),
  };
}

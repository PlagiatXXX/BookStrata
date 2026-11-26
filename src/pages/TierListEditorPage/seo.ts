/**
 * SEO-метаданные публичного тир-листа.
 *
 * Названия тир-листов не уникальны (разные пользователи называют свои списки
 * одинаково — «Книги», «2026», «Прочитанное»), поэтому в title/description
 * добавляется автор: никнейм уникален в системе и заодно даёт E-E-A-T-сигнал.
 */

import { pluralize } from "@/utils/pluralize";

const DEFAULT_TITLE = "Книжный тир-лист";
const DEFAULT_DESCRIPTION = "Книжный тир-лист на BookStrata — рейтинг книг по уровням";

/** Минимальное количество расставленных в тирах книг для индексации (защита от thin content) */
export const MIN_BOOKS_FOR_SEO = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ONLY_DIGITS_RE = /^\d+$/;
const LONG_DIGITS_RE = /^\d{6,}$/;
const HEX_HASH_RE = /^[0-9a-f]{16,}$/i;
const UUID_TITLE_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE_TITLE_RE =
  /^(?:image|img|photo|pic|picture|screenshot|screen|cover|scan|dsc|pxl|untitled|file|doc|page|безымянный|фото|скриншот|обложка|изображение|рисунок|картинка)(?:[\s._-]*(?:\(\d+\)|\d[\d._-]*))?(?:\.(?:jpe?g|png|webp|gif|bmp|avif))?$/i;
const COPY_SUFFIX_RE = /\((копия|copy)\)\s*$/i;
const GENERIC_TIER_LIST_TITLES = new Set([
  "тир-лист",
  "тир лист",
  "мой тир-лист",
  "мой тир лист",
  "без названия",
  "книги",
  "рейтинг",
  "список",
  "тест",
  "test",
  "untitled",
  "tier list",
  "tier-list",
]);

/**
 * Если пользователь зарегистрировался с email вместо никнейма,
 * скрываем доменную часть (@...) в публичных текстах и SEO-тегах.
 */
export function sanitizePublicAuthorName(
  username: string | null | undefined,
): string | null {
  const trimmed = username?.trim();
  if (!trimmed) return null;
  if (EMAIL_RE.test(trimmed)) {
    return trimmed.split("@")[0] || trimmed;
  }
  return trimmed;
}

export interface TierListSeoSignals {
  hasDescription?: boolean;
  hasThoughts?: boolean;
}

/**
 * Определяет, является ли название тир-листа слишком коротким, цифровым,
 * шаблонным или нетронутой копией без авторской индивидуальности.
 */
export function isLowValueTierListTitle(title: string | null | undefined): boolean {
  const normalized = title?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
  if (normalized.length < 5) return true;
  if (ONLY_DIGITS_RE.test(normalized)) return true;
  if (COPY_SUFFIX_RE.test(normalized)) return true;
  return GENERIC_TIER_LIST_TITLES.has(normalized);
}

/**
 * Распознаёт технические названия книг (имена файлов, md5/hex-хэши, UUID, длинные ID),
 * которые появляются при загрузке обложек без заполнения карточки.
 */
export function isTechnicalBookTitle(title: string | null | undefined): boolean {
  const trimmed = title?.trim() ?? "";
  if (trimmed.length <= 1) return true;
  if (LONG_DIGITS_RE.test(trimmed)) return true;
  if (HEX_HASH_RE.test(trimmed)) return true;
  if (UUID_TITLE_RE.test(trimmed)) return true;
  return FILE_TITLE_RE.test(trimmed);
}

export interface MeaningfulBookSeoInput {
  title?: string | null;
  author?: string | null;
  thoughts?: string | null;
  slug?: string | null;
  status?: string | null;
}

/**
 * Книга считается осмысленной для SEO и «Состава рейтинга», если у неё есть
 * автор, мысли автора, статус published или нетехническое название.
 */
export function isMeaningfulBookForSeo(book: MeaningfulBookSeoInput): boolean {
  if (!book.title?.trim()) return false;
  const hasAuthor = Boolean(
    book.author?.trim() && book.author.trim() !== "Неизвестен",
  );
  const hasThoughts = Boolean(book.thoughts?.trim());
  const isCatalog = Boolean(book.slug && book.status === "published");
  if (hasAuthor || hasThoughts || isCatalog) return true;
  return !isTechnicalBookTitle(book.title);
}

/**
 * Определяет, нужно ли ставить noindex на тир-лист.
 * Черновики, приватные списки, списки с менее 5 расставленными в тирах книгами
 * и неинформативные названия без описания/мыслей закрываются от индексации.
 */
export function shouldNoindexTierList(
  tierListId: string | undefined,
  isPublic: boolean | undefined,
  placedBooksCount: number,
  title?: string | null,
  signals?: TierListSeoSignals,
): boolean {
  if (tierListId === "new") return true;
  if (isPublic === false) return true;
  if (!title || title.trim().length === 0) return true;
  if (placedBooksCount < MIN_BOOKS_FOR_SEO) return true;
  const hasAuthorContent = Boolean(signals?.hasDescription || signals?.hasThoughts);
  if (!hasAuthorContent && isLowValueTierListTitle(title)) return true;
  return false;
}
export function buildTierListSeoTitle(
  title: string | null | undefined,
  username?: string | null,
  booksCount?: number,
): string {
  if (!title) return DEFAULT_TITLE;
  const safeAuthor = sanitizePublicAuthorName(username);
  const authorPart = safeAuthor ? ` от ${safeAuthor}` : "";
  const booksPart =
    booksCount && booksCount > 0
      ? ` из ${booksCount} ${pluralize(booksCount, "книга", "книги", "книг")}`
      : "";
  return `${title} — книжный тир-лист${booksPart}${authorPart}`;
}

/** «Тир-лист "Название" от пользователя @автор — N книг, топ: …». */
export function buildTierListSeoDescription(
  title: string | null | undefined,
  username?: string | null,
  booksCount?: number,
  topBooks?: string[],
): string {
  if (!title) return DEFAULT_DESCRIPTION;
  const safeAuthor = sanitizePublicAuthorName(username);
  const authorPart = safeAuthor ? ` от пользователя ${safeAuthor}` : "";
  const booksPart =
    booksCount && booksCount > 0
      ? `: ${booksCount} ${pluralize(booksCount, "книга", "книги", "книг")}`
      : "";
  const topPart =
    topBooks && topBooks.length > 0
      ? ` (топ: ${topBooks.slice(0, 3).join(", ")})`
      : "";
  return `Тир-лист «${title}»${authorPart}${booksPart}${topPart} — визуальный рейтинг книг, созданный на BookStrata`;
}
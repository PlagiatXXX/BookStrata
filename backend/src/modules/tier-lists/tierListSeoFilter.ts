// backend/src/modules/tier-lists/tierListSeoFilter.ts
// Правила SEO-фильтрации тир-листов и маскировки email-логинов.
// Синхронизировано с фронтенд-логикой в src/pages/TierListEditorPage/seo.ts.

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
 * Скрывает доменную часть (@...) у никнеймов, совпадающих с email.
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

/**
 * Определяет неинформативные, слишком короткие, цифровые или копипастные названия.
 */
export function isLowValueTierListTitle(title: string | null | undefined): boolean {
  const normalized = title?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
  if (normalized.length < 5) return true;
  if (ONLY_DIGITS_RE.test(normalized)) return true;
  if (COPY_SUFFIX_RE.test(normalized)) return true;
  return GENERIC_TIER_LIST_TITLES.has(normalized);
}

/**
 * Распознаёт технические названия книг (имена файлов, md5/hex-хэши, UUID, длинные ID).
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

export interface PlacedBookSeoItem {
  tierId?: number | null;
  thoughts?: string | null;
  book?: {
    title?: string | null;
    author?: string | null;
    slug?: string | null;
    status?: string | null;
  } | null;
}

/**
 * Подсчитывает количество распределённых по тирам книг с осмысленными названиями.
 */
export function countMeaningfulPlacedBooks(placements: PlacedBookSeoItem[]): number {
  return placements.filter((p) => {
    if (p.tierId === null) return false;
    if (p.book?.title === undefined) return true;
    return isMeaningfulBookForSeo({
      title: p.book.title,
      author: p.book.author,
      thoughts: p.thoughts,
      slug: p.book.slug,
      status: p.book.status,
    });
  }).length;
}

export interface TierListIndexabilityInput {
  isPublic: boolean;
  title: string | null | undefined;
  description?: string | null;
  placedBooksCount: number;
  hasThoughts?: boolean;
}

/**
 * Определяет, должен ли тир-лист индексироваться поисковыми системами,
 * попадать в sitemap.xml и статический пререндер.
 */
export function isTierListIndexable(input: TierListIndexabilityInput): boolean {
  if (!input.isPublic) return false;
  if (!input.title || input.title.trim().length === 0) return false;
  if (input.placedBooksCount < MIN_BOOKS_FOR_SEO) return false;
  const hasAuthorContent = Boolean(
    input.description?.trim() || input.hasThoughts,
  );
  if (!hasAuthorContent && isLowValueTierListTitle(input.title)) return false;
  return true;
}

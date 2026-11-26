// backend/src/modules/tier-lists/tierListSeoFilter.ts
// Правила SEO-фильтрации тир-листов и маскировки email-логинов.
// Синхронизировано с фронтенд-логикой в src/pages/TierListEditorPage/seo.ts.

export const MIN_BOOKS_FOR_SEO = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ONLY_DIGITS_RE = /^\d+$/;
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

/**
 * SEO-метаданные публичного тир-листа.
 *
 * Названия тир-листов не уникальны (разные пользователи называют свои списки
 * одинаково — «Книги», «2026», «Прочитанное»), поэтому в title/description
 * добавляется автор: никнейм уникален в системе и заодно даёт E-E-A-T-сигнал.
 */

const DEFAULT_TITLE = "Книжный тир-лист";
const DEFAULT_DESCRIPTION = "Книжный тир-лист на BookStrata — рейтинг книг по уровням";

/** Минимальное количество книг для индексации в поисковых системах (защита от thin content) */
export const MIN_BOOKS_FOR_SEO = 5;

/**
 * Определяет, нужно ли ставить noindex на тир-лист.
 * Списки менее 5 книг, черновики или списки без названия закрываются от индексации.
 */
export function shouldNoindexTierList(
  tierListId: string | undefined,
  isPublic: boolean | undefined,
  booksCount: number,
  title?: string | null,
): boolean {
  if (tierListId === "new") return true;
  if (isPublic === false) return true;
  if (!title || title.trim().length === 0) return true;
  if (booksCount < MIN_BOOKS_FOR_SEO) return true;
  return false;
}
export function buildTierListSeoTitle(
  title: string | null | undefined,
  username?: string | null,
  booksCount?: number,
): string {
  if (!title) return DEFAULT_TITLE;
  const authorPart = username ? ` от ${username}` : "";
  const booksPart =
    booksCount && booksCount > 0 ? ` из ${booksCount} книг` : "";
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
  const authorPart = username ? ` от пользователя ${username}` : "";
  const booksPart =
    booksCount && booksCount > 0 ? `: ${booksCount} книг` : "";
  const topPart =
    topBooks && topBooks.length > 0
      ? ` (топ: ${topBooks.slice(0, 3).join(", ")})`
      : "";
  return `Тир-лист «${title}»${authorPart}${booksPart}${topPart} — визуальный рейтинг книг, созданный на BookStrata`;
}
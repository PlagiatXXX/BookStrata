/**
 * SEO-метаданные публичного тир-листа.
 *
 * Названия тир-листов не уникальны (разные пользователи называют свои списки
 * одинаково — «Книги», «2026», «Прочитанное»), поэтому в title/description
 * добавляется автор: никнейм уникален в системе и заодно даёт E-E-A-T-сигнал.
 */

const DEFAULT_TITLE = "Книжный тир-лист";
const DEFAULT_DESCRIPTION = "Книжный тир-лист на BookStrata — рейтинг книг по уровням";

/** «Название — книжный тир-лист из N книг от автора» (автор и количество — опционально). */
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
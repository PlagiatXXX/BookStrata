/**
 * SEO-метаданные публичного тир-листа.
 *
 * Названия тир-листов не уникальны (разные пользователи называют свои списки
 * одинаково — «Книги», «2026», «Прочитанное»), поэтому в title/description
 * добавляется автор: никнейм уникален в системе и заодно даёт E-E-A-T-сигнал.
 */

const DEFAULT_TITLE = "Книжный тир-лист";
const DEFAULT_DESCRIPTION = "Книжный тир-лист на BookStrata — рейтинг книг по уровням";

/** «Название — книжный тир-лист от @автор» (автор — опционально). */
export function buildTierListSeoTitle(
  title: string | null | undefined,
  username?: string | null,
): string {
  if (!title) return DEFAULT_TITLE;
  const authorPart = username ? ` от @${username}` : "";
  return `${title} — книжный тир-лист${authorPart}`;
}

/** «Тир-лист "Название" от пользователя @автор — визуальный рейтинг книг…». */
export function buildTierListSeoDescription(
  title: string | null | undefined,
  username?: string | null,
): string {
  if (!title) return DEFAULT_DESCRIPTION;
  const authorPart = username ? ` от пользователя @${username}` : "";
  return `Тир-лист «${title}»${authorPart} — визуальный рейтинг книг, созданный на BookStrata`;
}
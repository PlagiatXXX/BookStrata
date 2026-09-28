// backend/src/modules/authors/authorSeo.ts
// Чистая логика SEO-страниц авторов:
//   - selectTargetAuthors — отбор авторов под генерацию описаний
//     (показы Wordstat за 2 года / 24 ≥ порога и ≥ MIN_BOOKS книг);
//   - buildSeoPrompt — промпт для LLM (описание + первый абзац статьи).
// Скрипты backend/scripts/* эти функции импортируют и покрываются здесь.

/** Показы Wordstat за 2 года, делённые на 24 месяца — минимум показов/мес */
export const MIN_SHOWS_PER_MONTH = 1000;
/** Минимум книг у автора, чтобы страница имела смысл */
export const MIN_BOOKS = 3;

export interface DemandRow {
  slug: string;
  name: string;
  /** Среднее число показов в месяц (Wordstat за 2 года / 24) */
  showsPerMonth: number;
  bookCount: number;
}

/** Отбор целевых авторов: спрос есть и книг достаточно */
export function selectTargetAuthors(rows: DemandRow[]): DemandRow[] {
  return rows.filter(
    (r) => r.showsPerMonth >= MIN_SHOWS_PER_MONTH && r.bookCount >= MIN_BOOKS,
  );
}

/**
 * Промпт генерации SEO-описания автора.
 * Формат ответа — JSON: { seoDescription, articleLead }.
 */
export function buildSeoPrompt(input: {
  name: string;
  bookTitles: string[];
  bookCount: number;
  genre: string | null;
}): string {
  const titles = input.bookTitles.slice(0, 10).join(", ");
  return [
    `Напиши SEO-текст про известного автора книг «${input.name}» на русском языке.`,
    `Известные книги: ${titles} (всего книг в каталоге: ${input.bookCount}${
      input.genre ? `, жанр: ${input.genre}` : ""
    }).`,
    "",
    "Требования:",
    "- Первый абзац статьи — 150–600 слов, мета-описание — отдельно, 100–150 символов.",
    "- Не выдумывай факты: опирайся только на перечисленные книги и общеизвестные сведения об авторе.",
    "- Без воды и маркетинговых штампов, конкретика по книгам.",
    "- Естественно вплетай хвостовые запросы: «{автор} книги», «{автор} библиография», «{автор} рейтинг книг».",
    "- Без упоминания других сайтов-конкурентов.",
    "",
    'Формат ответа строго JSON: {"seoDescription": "...100-150 символов...", "articleLead": "...первый абзац..."}.',
  ].join("\n");
}

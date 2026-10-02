// src/pages/AuthorPage/components/AuthorBibliography.tsx
// «Полная библиография» (спека §6, дизайн reference/screen.png): серые
// карточки-разделы на каждую книгу + чипсет-фильтры с счётчиками.
// Пустой список книг — секция не рендерится.
import { useState } from "react";
import { Link } from "react-router-dom";
import type { AuthorBookCard } from "@/lib/authorsApi";

type AuthorBibliographyProps = {
  books: AuthorBookCard[];
};

type BookSort = "order" | "rating";

/** По рейтингу: по убыванию (null — в конец), tie-break по названию */
function byRatingDesc(a: AuthorBookCard, b: AuthorBookCard): number {
  const ar = a.rating ?? Number.NEGATIVE_INFINITY;
  const br = b.rating ?? Number.NEGATIVE_INFINITY;
  if (ar !== br) return br - ar;
  return a.title.localeCompare(b.title, "ru");
}

const SORT_OPTIONS: { value: BookSort; label: string }[] = [
  { value: "order", label: "По порядку" },
  { value: "rating", label: "По рейтингу" },
];

const ALL_GENRES = "Все";

const chipBase =
  "rounded-md px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors";

export function AuthorBibliography({ books }: AuthorBibliographyProps) {
  const [genre, setGenre] = useState(ALL_GENRES);
  const [sort, setSort] = useState<BookSort>("order");

  if (books.length === 0) return null;

  const genres = Array.from(
    new Set(books.map((b) => b.genre).filter((g): g is string => Boolean(g))),
  ).sort((a, b) => a.localeCompare(b, "ru"));

  const countOf = (g: string) =>
    g === ALL_GENRES ? books.length : books.filter((b) => b.genre === g).length;

  const filtered = genre === ALL_GENRES ? books : books.filter((b) => b.genre === genre);
  const rows = sort === "rating" ? [...filtered].sort(byRatingDesc) : filtered;

  return (
    <section id="bibliography" className="ap-section scroll-mt-20">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-[var(--ap-gold)]" />
              <span className="text-xs font-medium uppercase tracking-[0.25em] text-[var(--ap-gold)]">
                Каталог изданий
              </span>
            </div>
            <h2 className="font-[family-name:var(--ap-display)] text-xl font-light text-[var(--ap-ink)] md:text-2xl">
              Полная библиография
            </h2>
            <p className="max-w-2xl text-xs leading-relaxed text-[var(--ap-ink-muted)]">
              Хронологический архив всех опубликованных произведений автора
            </p>
          </div>

          {/* Серый чипсет: фильтры по жанрам с счётчиками + сортировка (reference) */}
          <div
            className="inline-flex w-fit flex-wrap items-center gap-1 rounded-[var(--ap-radius-lg)] border border-[var(--ap-border)] bg-[var(--ap-surface)] p-1"
            role="group"
            aria-label="Фильтры и сортировка книг"
          >
            {[ALL_GENRES, ...genres].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenre(g)}
                aria-pressed={genre === g}
                className={`${chipBase} ${
                  genre === g
                    ? "border border-[var(--ap-gold)] bg-[var(--ap-gold-soft)] text-[var(--ap-gold)]"
                    : "border border-transparent text-[var(--ap-ink-muted)] hover:text-[var(--ap-ink)]"
                }`}
              >
                {g} ({countOf(g)})
              </button>
            ))}

            <span className="mx-1 h-6 w-px bg-[var(--ap-border)]" aria-hidden="true" />

            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSort(option.value)}
                aria-pressed={sort === option.value}
                className={`${chipBase} ${
                  sort === option.value
                    ? "border border-[var(--ap-gold)] bg-[var(--ap-gold-soft)] text-[var(--ap-gold)]"
                    : "border border-transparent text-[var(--ap-ink-muted)] hover:text-[var(--ap-ink)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Серые разделы-карточки: одна запись — одна книга */}
        <div className="flex flex-col gap-3">
          {rows.map((book) => (
            <article
              key={book.id}
              className="ap-biblio-card flex flex-col gap-3 rounded-[var(--ap-radius-lg)] border border-[var(--ap-border)] bg-[var(--ap-surface)] p-4 transition-colors hover:bg-[var(--ap-surface-raised)] md:flex-row md:items-center md:gap-6 md:p-5"
            >
              <span className="shrink-0 font-mono text-xs text-[var(--ap-gold)] md:w-14">
                {book.publishedYear ?? "—"}
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="font-[family-name:var(--ap-display)] text-sm leading-snug text-[var(--ap-ink)]">
                  {book.slug ? (
                    <Link
                      to={`/books/${book.slug}`}
                      className="transition-colors hover:text-[var(--ap-gold)]"
                    >
                      {book.title}
                    </Link>
                  ) : (
                    book.title
                  )}
                </h3>
              </div>

              {book.genre && (
                <span className="w-fit rounded-md border border-[var(--ap-border)] bg-[var(--ap-bg)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--ap-ink-muted)]">
                  {book.genre}
                </span>
              )}

              <div className="flex shrink-0 items-baseline gap-3 md:w-36">
                <span className="text-xs font-semibold text-[var(--ap-gold)]">
                  {book.rating !== null ? `${book.rating.toFixed(1)} / 10` : "—"}
                </span>
              </div>

              <div className="shrink-0 md:text-right">
                {book.slug ? (
                  <Link
                    to={`/books/${book.slug}`}
                    aria-label={`Открыть книгу «${book.title}»`}
                    className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--ap-gold)] underline-offset-4 hover:underline"
                  >
                    Открыть книгу →
                  </Link>
                ) : (
                  <span className="text-xs uppercase tracking-[0.12em] text-[var(--ap-ink-faint)]">
                    Открыть книгу
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

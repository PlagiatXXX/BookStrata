// src/pages/AuthorPage/components/AuthorShowcase.tsx
// «Избранные романы» (спека §3, дизайн reference/screen.png): полноширинные
// панели — чередование сторон (обложка слева/справа) и акценты палитры
// (gold/rose/cobalt) для цитаты, подсветки обложки и кнопки.
// Пустой список — секция скрыта.
import { Link } from "react-router-dom";
import type { AuthorShowcaseItem } from "@/lib/authorsApi";

type AuthorShowcaseProps = {
  items: AuthorShowcaseItem[];
};

// Чипы метаданных: жанр/год/рейтинг различаются акцентами палитры
// (rose/cobalt/gold) в стиле пилюль «Экранизаций» (bg-акцент/15 + text).
const chipBase =
  "rounded-md border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]";
const genreChipClass = `${chipBase} border-[var(--ap-rose)]/40 bg-[var(--ap-rose)]/15 text-[var(--ap-rose)]`;
const yearChipClass = `${chipBase} border-[var(--ap-cobalt)]/40 bg-[var(--ap-cobalt)]/15 text-[var(--ap-cobalt)]`;
const ratingChipClass = `${chipBase} border-[var(--ap-gold)]/40 bg-[var(--ap-gold)]/15 text-[var(--ap-gold)]`;

const ACCENTS = ["gold", "rose", "cobalt"] as const;

type Accent = (typeof ACCENTS)[number];

function ShowcaseCard({
  book,
  pullQuote,
  index,
}: AuthorShowcaseItem & { index: number }) {
  const flip = index % 2 === 1;
  const accent: Accent = ACCENTS[index % ACCENTS.length];

  return (
    <article
      data-accent={accent}
      className={`ap-showcase-card flex flex-col gap-6 rounded-[var(--ap-radius-lg)] border border-[var(--ap-border)] bg-[var(--ap-surface)] p-5 md:flex-row md:gap-8 md:p-8${
        flip ? " ap-showcase-card--flip" : ""
      }`}
    >
      <div className="w-full max-w-[16rem] shrink-0 md:w-1/3">
        <div className="ap-showcase-cover relative rounded-[var(--ap-radius)] border border-[var(--ap-border)] bg-[var(--ap-bg)] transition-colors duration-300">
          <span
            aria-hidden
            className="ap-showcase-cover-glow pointer-events-none absolute -inset-4 rounded-[inherit]"
          />
          <img
            src={book.coverImageUrl}
            alt={`Обложка книги «${book.title}»`}
            loading="lazy"
            className="relative aspect-[2/3] w-full rounded-[var(--ap-radius)] object-cover"
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {book.genre && <span className={genreChipClass}>{book.genre}</span>}
          {book.publishedYear && (
            <span className={yearChipClass}>Год {book.publishedYear}</span>
          )}
          {book.rating != null && (
            <span className={ratingChipClass}>{book.rating.toFixed(1)} / 10</span>
          )}
        </div>

        <h3 className="font-[family-name:var(--ap-display)] text-2xl font-light leading-tight text-[var(--ap-ink)] md:text-3xl">
          {book.title}
        </h3>

        {pullQuote && (
          <p className="ap-pull-quote max-w-2xl font-[family-name:var(--ap-display)] text-base italic leading-relaxed md:text-lg">
            {pullQuote}
          </p>
        )}

        {book.description && (
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--ap-ink-muted)]">
            {book.description}
          </p>
        )}

        {book.slug && (
          <Link
            to={`/books/${book.slug}`}
            aria-label={`На страницу книги «${book.title}»`}
            className="ap-showcase-cta w-fit mt-auto rounded-[var(--ap-radius)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ap-bg)] transition-opacity hover:opacity-90"
          >
            На страницу книги
          </Link>
        )}
      </div>
    </article>
  );
}

export function AuthorShowcase({ items }: AuthorShowcaseProps) {
  if (items.length === 0) return null;

  return (
    <section className="ap-section">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-[var(--ap-gold)]" />
            <span className="text-xs font-medium uppercase tracking-[0.25em] text-[var(--ap-gold)]">
              Архив шедевров
            </span>
          </div>
          <h2 className="font-[family-name:var(--ap-display)] text-2xl font-light text-[var(--ap-ink)] md:text-3xl">
            Избранные романы
          </h2>
        </div>

        <p className="max-w-md text-sm leading-relaxed text-[var(--ap-ink-muted)] lg:text-right">
          Монументальные полотна, ставшие международными явлениями и
          сформировавшие современный психологический канон.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {items.map((item, index) => (
          <ShowcaseCard
            key={item.book.id}
            book={item.book}
            pullQuote={item.pullQuote}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

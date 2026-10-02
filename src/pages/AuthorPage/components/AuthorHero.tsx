// src/pages/AuthorPage/components/AuthorHero.tsx
// Cinematic full-bleed hero (reference/screen.png): портрет фоном на всю секцию,
// текст поверх слева, полоса статистики внизу. Без портрета — glow-подложка.
import { getAuthorAffiliateLink } from "@/lib/affiliateLinks";
import { pluralize } from "@/lib/plural";
import type { AuthorPageData, AuthorStatItem } from "@/lib/authorsApi";

type AuthorHeroProps = {
  author: AuthorPageData["author"];
  stats: AuthorStatItem[];
};

// Единый стиль мета-полосы: value — золото display-шрифтом, label — muted капсом
// (используется и ручными stats, и авто-полями книг/рейтинга)
const STAT_VALUE_CLASS =
  "font-[family-name:var(--ap-display)] text-base font-light leading-none text-[var(--ap-gold)]";
const STAT_LABEL_CLASS =
  "mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--ap-ink-muted)]";

export function AuthorHero({ author, stats }: AuthorHeroProps) {
  const [cta] = getAuthorAffiliateLink(author.name);
  const portrait = author.heroImageUrl;

  return (
    <section className="relative overflow-hidden border-b border-[var(--ap-border)]">
      {/* Подложка: glow + (опционально) портрет фоном и затемнители для читаемости */}
      <div className="ap-hero-bg absolute inset-0">
        <div className="ap-hero-glow absolute inset-0" />
        {portrait && (
          <>
            <img
              src={portrait}
              alt={`Портрет автора — ${author.name}`}
              className="absolute inset-0 h-full w-full object-cover object-[center_25%]"
            />
            {/* Затемнение: базовое + слева (текст) + снизу (стык со следующей секцией) */}
            <div className="absolute inset-0 bg-black/45" />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--ap-bg)] via-[var(--ap-bg)]/75 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--ap-bg)] via-transparent to-transparent" />
          </>
        )}
      </div>

      <div className="relative z-10 mx-auto flex min-h-svh max-w-6xl flex-col justify-end gap-5 px-4 py-[var(--ap-section-gap)] sm:px-6 lg:px-8 max-lg:min-h-0">
        <div className="flex max-w-2xl flex-col gap-5">
          {author.badge && (
            <span className="w-fit inline-flex items-center gap-2 rounded-full border border-[var(--ap-gold)]/40 bg-[var(--ap-gold-soft)] px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--ap-gold)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ap-gold)]" />
              {author.badge}
            </span>
          )}

          <div className="flex flex-col gap-3">
            <h1 className="font-[family-name:var(--ap-display)] text-3xl font-light leading-none tracking-tight text-[var(--ap-ink)] md:text-4xl">
              {author.name}
            </h1>
            {author.motto && (
              <p className="font-[family-name:var(--ap-display)] text-lg italic text-[var(--ap-gold)] md:text-xl">
                {author.motto}
              </p>
            )}
          </div>

          <p className="whitespace-pre-line text-sm font-light leading-relaxed text-[var(--ap-ink)]">
            {author.seoDescription}
          </p>

          <div className="flex flex-col gap-2 pt-1">
            <div className="flex flex-wrap gap-3">
              <a
                href={cta.url}
                target="_blank"
                rel="sponsored nofollow noopener"
                className="w-fit rounded-[var(--ap-radius)] bg-[var(--ap-gold)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ap-bg)] transition-opacity hover:opacity-90"
              >
                Читать книги автора
              </a>
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("bibliography")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="w-fit rounded-[var(--ap-radius)] border border-[var(--ap-gold)]/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ap-gold)] transition-colors hover:bg-[var(--ap-gold-soft)]"
              >
                Смотреть библиографию ↓
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Metric Strip: ручные stats + авто-поля (спека §1) */}
        <div className="grid max-w-5xl grid-cols-2 gap-x-5 gap-y-4 rounded-[var(--ap-radius-lg)] border border-[var(--ap-border)] bg-[var(--ap-bg)]/40 px-5 py-4 backdrop-blur-sm sm:grid-cols-3 md:grid-cols-5">
          {stats.map((stat, index) => (
            <div
              key={`${stat.label}-${index}`}
              className="flex flex-col items-center justify-center text-center"
            >
              <span className={STAT_VALUE_CLASS}>{stat.value}</span>
              <span className={STAT_LABEL_CLASS}>{stat.label}</span>
            </div>
          ))}
          <div className="flex flex-col items-center justify-center text-center">
            <span className={STAT_VALUE_CLASS}>{author.bookCount}</span>
            <span className={STAT_LABEL_CLASS}>
              {pluralize(author.bookCount, ["книга", "книги", "книг"])}
            </span>
          </div>
          {author.avgRating !== null && (
            <div className="flex flex-col items-center justify-center text-center">
              <span className={STAT_VALUE_CLASS}>
                {author.avgRating.toFixed(1)} / 10
              </span>
              <span className={STAT_LABEL_CLASS}>Средний рейтинг</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

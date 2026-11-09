// src/pages/AuthorPage/components/AuthorHero.tsx
// Cinematic full-bleed hero (reference/screen.png): портрет фоном на всю секцию,
// текст поверх слева, полоса статистики внизу. Без портрета — glow-подложка.
import { getAuthorAffiliateLink } from "@/lib/affiliateLinks";
import { pluralize } from "@/lib/plural";
import type { AuthorPageData, AuthorStatItem } from "@/lib/authorsApi";
import { BorderBeam } from "@/components/ui/border-beam";

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
  const affiliateLinks = getAuthorAffiliateLink(author.name);
  const cta = affiliateLinks[0];
  const portrait = author.heroImageUrl;

  return (
    <section className="relative overflow-hidden border-b border-(--ap-border)">
      {/* Подложка: glow + (опционально) портрет фоном и затемнители для читаемости */}
      <div className="ap-hero-bg absolute inset-0">
        <div className="ap-hero-glow absolute inset-0" />
        {portrait && (
          <>
            <img
              src={portrait}
              alt={`Портрет автора — ${author.name}`}
              className="absolute inset-x-0 top-0 h-[52vh] min-h-90 max-h-125 w-full object-cover object-[center_20%] lg:inset-0 lg:h-full lg:max-h-none lg:object-[center_25%]"
            />
            {/* Базовое затемнение картинки (и на мобильных, и на десктопе) */}
            <div className="absolute inset-x-0 top-0 h-[52vh] min-h-90 max-h-125 w-full bg-black/25 lg:inset-0 lg:h-full lg:max-h-none" />
            {/* Дополнительный градиент на мобильных: плавный переход снизу портрета в цвет фона страницы */}
            <div className="absolute inset-x-0 top-0 h-[52vh] min-h-90 max-h-125 w-full bg-linear-to-t from-(--ap-bg) via-(--ap-bg)/50 to-transparent lg:hidden" />
            {/* Затемнения на десктопе: слева (для текста) + снизу (стык со следующей секцией) */}
            <div className="hidden lg:block absolute inset-0 bg-linear-to-r from-(--ap-bg) via-(--ap-bg)/75 to-transparent" />
            <div className="hidden lg:block absolute inset-0 bg-linear-to-t from-(--ap-bg) via-transparent to-transparent" />
          </>
        )}
      </div>

      <div
        className={`relative z-10 mx-auto flex min-h-svh max-w-6xl flex-col justify-end gap-5 px-4 py-(--ap-section-gap) sm:px-6 lg:px-8 max-lg:min-h-0 ${
          portrait ? "pt-[38vh] xs:pt-[42vh] lg:pt-(--ap-section-gap)" : ""
        }`}
      >
        {/* Парящий медальон рейтинга автора в верхнем правом углу (с BorderBeam и пояснением) */}
        {author.avgRating !== null && (
          <div
            data-testid="author-rating-medallion"
            title={`Средний рейтинг книг автора: ${author.avgRating.toFixed(1)} / 10`}
            aria-label={`Средний рейтинг книг автора: ${author.avgRating.toFixed(1)} из 10`}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 lg:right-8 z-20 flex flex-col items-center justify-center overflow-hidden rounded-xl border border-(--ap-gold)/20 bg-(--ap-surface)/90 px-2.5 py-1.5 sm:px-3 sm:py-2 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_20px_rgba(201,169,97,0.12)] transition-all duration-300 hover:shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_28px_rgba(201,169,97,0.25)]"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
              <BorderBeam
                duration={10}
                size={40}
                colorFrom="#c9a961"
                colorTo="#fbbf24"
                borderWidth={1.5}
              />
            </div>

            <div className="flex items-baseline gap-1">
              <span className="font-(family-name:--ap-display) text-base sm:text-lg font-light leading-none text-(--ap-ink)">
                {author.avgRating.toFixed(1)}
              </span>
              <span className="text-[9px] font-normal leading-none text-(--ap-gold)/80">
                / 10
              </span>
            </div>

            <span className="mt-0.5 text-[7px] sm:text-[8px] font-semibold uppercase tracking-[0.14em] sm:tracking-[0.16em] text-(--ap-gold)">
              Рейтинг книг
            </span>
          </div>
        )}

        <div className="flex max-w-2xl flex-col gap-5">
          {author.badge && (
            <span className="w-fit max-w-[calc(100%-5.5rem)] sm:max-w-none inline-flex items-center gap-2 rounded-full border border-(--ap-gold)/40 bg-(--ap-gold-soft) px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-(--ap-gold)">
              <span className="h-1.5 w-1.5 rounded-full bg-(--ap-gold)" />
              {author.badge}
            </span>
          )}

          <div className="flex flex-col gap-3 pr-20 sm:pr-0">
            <h1 className="font-(family-name:--ap-display) text-3xl font-light leading-none tracking-tight text-(--ap-ink) md:text-4xl">
              {author.name}
            </h1>
            {author.motto && (
              <p className="font-(family-name:--ap-display) text-lg italic text-(--ap-gold) md:text-xl">
                {author.motto}
              </p>
            )}
          </div>

          <p className="whitespace-pre-line text-sm font-light leading-relaxed text-(--ap-ink)">
            {author.seoDescription}
          </p>

          <div className="flex flex-col gap-2 pt-4 sm:pt-1">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
              {cta ? (
                <>
                  <a
                    href={cta.url}
                    target="_blank"
                    rel="sponsored nofollow noopener"
                    className="inline-flex min-h-11 w-full sm:w-fit items-center justify-center rounded-(--ap-radius) bg-(--ap-gold) px-5 py-3 sm:py-2.5 text-xs sm:text-[11px] font-semibold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-(--ap-bg) transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
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
                    className="inline-flex min-h-11 w-full sm:w-fit items-center justify-center rounded-(--ap-radius) border border-(--ap-gold)/40 bg-(--ap-surface)/40 px-5 py-3 sm:py-2.5 text-xs sm:text-[11px] font-semibold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-(--ap-gold) backdrop-blur-xs transition-all duration-150 hover:bg-(--ap-gold-soft) active:scale-[0.98]"
                  >
                    Смотреть библиографию ↓
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("bibliography")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="inline-flex min-h-11 w-full sm:w-fit items-center justify-center rounded-(--ap-radius) bg-(--ap-gold) px-5 py-3 sm:py-2.5 text-xs sm:text-[11px] font-semibold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-(--ap-bg) transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                >
                  Книги автора на сайте ↓
                </button>
              )}
            </div>
            {/* Признак рекламы рядом с партнёрской кнопкой (ФЗ-38 «О рекламе») — только при наличии cta */}
            {cta?.disclaimer && (
              <p className="text-[10px] leading-relaxed text-(--ap-ink-muted)">
                {cta.disclaimer}
              </p>
            )}
          </div>
        </div>

        {/* Bottom Metric Strip: ручные stats + авто-поля (спека §1) */}
        <div className="grid max-w-5xl grid-cols-2 gap-x-5 gap-y-4 rounded-(--ap-radius-lg) border border-(--ap-border) bg-(--ap-bg)/40 px-5 py-4 backdrop-blur-sm sm:grid-cols-3 md:grid-cols-5">
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
              {pluralize(author.bookCount, ["книга", "книги", "книг"])} на сайте
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

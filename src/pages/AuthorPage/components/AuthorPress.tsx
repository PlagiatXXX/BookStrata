// src/pages/AuthorPage/components/AuthorPress.tsx
// «Голоса мировой прессы» (спека §9): цитаты критиков — display-курсив + подпись.
// Пустой список — секция не рендерится. Открывающая кавычка — в CSS (::before),
// чтобы DOM-текст цитаты оставался точным для тестов и скринридеров.
import type { AuthorPressQuoteItem } from "@/lib/authorsApi";

type AuthorPressProps = {
  items: AuthorPressQuoteItem[];
};

export function AuthorPress({ items }: AuthorPressProps) {
  if (items.length === 0) return null;

  return (
    <section className="ap-section">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="h-px w-10 bg-[var(--ap-gold)]" />
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-[var(--ap-gold)]">
            Критика
          </span>
        </div>
        <h2 className="font-[family-name:var(--ap-display)] text-2xl font-light text-[var(--ap-ink)] md:text-3xl">
          Голоса мировой прессы
        </h2>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {items.map((item, index) => (
          <figure
            key={`${item.source}-${index}`}
            className="ap-press-card flex flex-col gap-4 p-6"
          >
            <blockquote className="ap-press-quote font-[family-name:var(--ap-display)] text-lg font-light italic leading-relaxed text-[var(--ap-ink)]">
              {item.quote}
            </blockquote>
            <figcaption className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-[var(--ap-border)] pt-4">
              <span className="text-sm font-semibold text-[var(--ap-ink)]">
                {item.source}
              </span>
              {item.sourceRole && (
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--ap-ink-muted)]">
                  {item.sourceRole}
                </span>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

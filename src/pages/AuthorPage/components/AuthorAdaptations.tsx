// src/pages/AuthorPage/components/AuthorAdaptations.tsx
// «Кино & Театр» (спека §8): карточки адаптаций с kind-бейджем и внешней ссылкой.
// Пустой список — секция не рендерится; url = null — карточка без ссылки.
// Внутренний url («/…» — авто-факт из лонгрида книги) — router-ссылка «К книге»,
// внешний — <a target="_blank"> «Смотреть».
import { Link } from "react-router-dom";
import type { AuthorAdaptationItem } from "@/lib/authorsApi";

type AuthorAdaptationsProps = {
  items: AuthorAdaptationItem[];
};

const KIND_LABEL: Record<AuthorAdaptationItem["kind"], string> = {
  film: "Фильм",
  theatre: "Театр",
  tv: "Сериал",
};

const KIND_BADGE: Record<AuthorAdaptationItem["kind"], string> = {
  film: "bg-[var(--ap-gold)]/15 text-[var(--ap-gold)]",
  theatre: "bg-[var(--ap-cobalt)]/15 text-[var(--ap-cobalt)]",
  tv: "bg-[var(--ap-rose)]/15 text-[var(--ap-rose)]",
};

function AdaptationCard({ item }: { item: AuthorAdaptationItem }) {
  const isInternal = item.url?.startsWith("/") ?? false;

  const inner = (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${KIND_BADGE[item.kind]}`}
        >
          {KIND_LABEL[item.kind]}
        </span>
        {item.meta && (
          <span className="text-xs uppercase tracking-[0.15em] text-[var(--ap-ink-muted)]">
            {item.meta}
          </span>
        )}
      </div>

      <h3 className="mt-3 font-[family-name:var(--ap-display)] text-lg font-light text-[var(--ap-ink)]">
        {item.title}
      </h3>

      {item.description && (
        <p className="mt-2 text-sm leading-relaxed text-[var(--ap-ink-muted)]">
          {item.description}
        </p>
      )}

      {item.url && (
        <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--ap-gold)]">
          {isInternal ? "К книге" : "Смотреть"} <span aria-hidden="true">→</span>
        </span>
      )}
    </>
  );

  const className = "ap-adapt-card block p-5";

  if (!item.url) return <div className={className}>{inner}</div>;

  if (isInternal) {
    return (
      <Link to={item.url} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {inner}
    </a>
  );
}

export function AuthorAdaptations({ items }: AuthorAdaptationsProps) {
  if (items.length === 0) return null;

  return (
    <section className="ap-section">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="h-px w-10 bg-[var(--ap-gold)]" />
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-[var(--ap-gold)]">
            Адаптации
          </span>
        </div>
        <h2 className="font-[family-name:var(--ap-display)] text-2xl font-light text-[var(--ap-ink)] md:text-3xl">
          Кино &amp; Театр
        </h2>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {items.map((item, index) => (
          <AdaptationCard key={`${item.title}-${index}`} item={item} />
        ))}
      </div>
    </section>
  );
}

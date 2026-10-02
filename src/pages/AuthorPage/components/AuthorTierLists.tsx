// src/pages/AuthorPage/components/AuthorTierLists.tsx
// «В тир-листах» (спека §7): плитки-ссылки на тир-листы с автором.
// Пустой список — секция не рендерится.
import { Link } from "react-router-dom";
import type { AuthorPageData } from "@/lib/authorsApi";

type AuthorTierListsProps = {
  lists: AuthorPageData["tierLists"];
};

export function AuthorTierLists({ lists }: AuthorTierListsProps) {
  if (lists.length === 0) return null;

  return (
    <section className="ap-section">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="h-px w-10 bg-[var(--ap-gold)]" />
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-[var(--ap-gold)]">
            Коллективные рейтингы
          </span>
        </div>
        <h2 className="font-[family-name:var(--ap-display)] text-2xl font-light text-[var(--ap-ink)] md:text-3xl">
          В тир-листах{" "}
          <span className="text-lg text-[var(--ap-ink-muted)]">({lists.length})</span>
        </h2>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {lists.map((list) => (
          <Link
            key={list.id}
            to={`/tier-lists/${list.slug ?? list.id}`}
            className="ap-tier-tile group flex items-center justify-between gap-4 px-5 py-4"
          >
            <span className="font-[family-name:var(--ap-display)] text-base text-[var(--ap-ink)]">
              {list.title}
            </span>
            <span
              aria-hidden="true"
              className="text-[var(--ap-gold)] transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

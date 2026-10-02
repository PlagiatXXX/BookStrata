// src/pages/AuthorsPage/AuthorsPage.tsx
// Страница «Все авторы» /authors — каталог авторов с поиском и «Показать ещё».
// Карточка: имя + число книг → ссылка на /authors/:slug.
import { useState } from "react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { Spinner } from "@/components/Spinner";
import { Header } from "@/ui/Header";
import { Footer } from "@/ui/Footer";
import { pluralize } from "@/lib/plural";
import { useAuthorsPage } from "./hooks/useAuthorsPage";
// Токены --ap-* и .ap-section живут в css страницы автора (общая тема)
import "@/pages/AuthorPage/AuthorPage.css";

const PAGE_SIZE = 6;

export default function AuthorsPage() {
  const { data: authors, isLoading, isError } = useAuthorsPage();
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = (authors ?? []).filter((a) =>
    a.name.toLowerCase().includes(normalizedQuery),
  );
  const shown = filtered.slice(0, visibleCount);
  const hasMore = shown.length < filtered.length;

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <>
      <SEOHead
        title="Все авторы"
        description="Все авторы каталога BookStrata — писатели, чьи книги опубликованы на площадке: библиография, рейтинги и тир-листы."
        url="/authors"
        breadcrumbs={[
          { name: "Главная", url: "/" },
          { name: "Все авторы", url: "/authors" },
        ]}
      />

      <Header showSearch={false} />

      <div className="author-page min-h-screen bg-[var(--ap-bg)] pb-24">
        <div className="mx-auto max-w-6xl px-4 pt-24">
          <Breadcrumbs
            theme="dark"
            items={[{ label: "Главная", href: "/" }, { label: "Все авторы" }]}
          />
        </div>

        <section className="ap-section">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="h-px w-10 bg-[var(--ap-gold)]" />
                <span className="text-xs font-medium uppercase tracking-[0.25em] text-[var(--ap-gold)]">
                  Каталог
                </span>
              </div>
              <h1 className="font-[family-name:var(--ap-display)] text-2xl font-light text-[var(--ap-ink)] md:text-3xl">
                Все авторы
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-[var(--ap-ink-muted)]">
                Писатели, чьи книги опубликованы в каталоге BookStrata.
              </p>
            </div>

            {/* Поиск по имени — фильтрация на клиенте */}
            <div className="flex max-w-md items-center gap-3">
              <input
                type="search"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                aria-label="Поиск по авторам"
                placeholder="Поиск по имени автора…"
                className="w-full rounded-[var(--ap-radius)] border border-[var(--ap-border)] bg-[var(--ap-surface)] px-4 py-2 text-sm text-[var(--ap-ink)] placeholder:text-[var(--ap-ink-faint)] focus:border-[var(--ap-gold)]/50 focus:outline-none"
              />
            </div>

            {isLoading && (
              <div className="flex justify-center py-10">
                <Spinner size="xl" />
              </div>
            )}

            {!isLoading && isError && (
              <p className="py-10 text-sm text-[var(--ap-ink-muted)]">
                Не удалось загрузить авторов. Попробуйте обновить страницу.
              </p>
            )}

            {!isLoading && !isError && filtered.length === 0 && (
              <p className="py-10 text-sm text-[var(--ap-ink-muted)]">
                Ничего не найдено
              </p>
            )}

            {!isLoading && !isError && filtered.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((author) => {
                  const card = (
                    <>
                      <span className="font-[family-name:var(--ap-display)] text-base text-[var(--ap-ink)] transition-colors group-hover:text-[var(--ap-gold)]">
                        {author.name}
                      </span>
                      <span className="flex shrink-0 items-baseline gap-1 text-xs text-[var(--ap-ink-muted)]">
                        <span className="font-semibold text-[var(--ap-gold)]">
                          {author.bookCount}
                        </span>
                        {pluralize(author.bookCount, ["книга", "книги", "книг"])}
                      </span>
                    </>
                  );
                  const cardClass =
                    "group flex items-baseline justify-between gap-4 rounded-[var(--ap-radius-lg)] border border-[var(--ap-border)] bg-[var(--ap-surface)] p-4 transition-colors hover:border-[var(--ap-gold)]/40 hover:bg-[var(--ap-surface-raised)]";

                  return author.slug ? (
                    <Link key={author.id} to={`/authors/${author.slug}`} className={cardClass}>
                      {card}
                    </Link>
                  ) : (
                    <div key={author.id} className={cardClass}>
                      {card}
                    </div>
                  );
                })}
              </div>
            )}

            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className="rounded-[var(--ap-radius)] border border-[var(--ap-gold)]/50 px-6 py-2.5 text-xs font-medium uppercase tracking-[0.18em] text-[var(--ap-gold)] transition-colors hover:bg-[var(--ap-gold-soft)]"
                >
                  Показать ещё
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}

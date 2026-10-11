// src/pages/AuthorsPage/AuthorsPage.tsx
// Страница «Все авторы» /authors — каталог авторов с поиском и «Показать ещё».
// Карточки: авторы с фото (из админки) — крупные с портретом первыми,
// без фото — компактные строки (имя + число книг) → /authors/:slug.
import { useState } from "react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { Spinner } from "@/components/Spinner";
import { Header } from "@/ui/Header";
import { Footer } from "@/ui/Footer";
import { pluralize } from "@/lib/plural";
import { type AuthorResult } from "@/lib/authorsApi";
import { useAuthorsPage } from "./hooks/useAuthorsPage";
// Токены --ap-* и .ap-section живут в css страницы автора (общая тема)
import "@/pages/AuthorPage/AuthorPage.css";

const PAGE_SIZE = 6;

function authorInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0] ?? "")
      .join("")
      .toUpperCase() || "?"
  );
}

/** Карточка автора с портретом (heroImageUrl из админки) — фото по центру. */
function AuthorPhotoCard({ author }: { author: AuthorResult }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const linkClass =
    "group flex flex-col items-center overflow-hidden rounded-[var(--ap-radius-lg)] border border-[var(--ap-border)] bg-[var(--ap-surface)] px-4 pb-4 pt-5 transition-colors hover:border-[var(--ap-gold)]/40 hover:bg-[var(--ap-surface-raised)]";

  const body = (
    <>
      <div className="relative aspect-[3/4] w-44 overflow-hidden rounded-[var(--ap-radius)] bg-[var(--ap-bg)]">
        {photoFailed ? (
          <span
            aria-hidden
            className="flex h-full w-full items-center justify-center font-[family-name:var(--ap-display)] text-3xl text-[var(--ap-gold)]/50"
          >
            {authorInitials(author.name)}
          </span>
        ) : (
          <img
            src={author.heroImageUrl ?? undefined}
            alt={`Портрет: ${author.name}`}
            loading="lazy"
            onError={() => setPhotoFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}
      </div>
      <span className="flex flex-col items-center gap-1 pt-3 text-center">
        <span className="font-[family-name:var(--ap-display)] text-base text-[var(--ap-ink)] transition-colors group-hover:text-[var(--ap-gold)]">
          {author.name}
        </span>
        <span className="text-xs text-[var(--ap-ink-muted)]">
          <span className="font-semibold text-[var(--ap-gold)]">{author.bookCount}</span>{" "}
          {pluralize(author.bookCount, ["книга", "книги", "книг"])}
        </span>
      </span>
    </>
  );

  return author.slug ? (
    <Link to={`/authors/${author.slug}`} className={linkClass}>
      {body}
    </Link>
  ) : (
    <div className={linkClass}>{body}</div>
  );
}

/** Компактная строка автора без фото — имя + число книг. */
function AuthorCompactCard({ author }: { author: AuthorResult }) {
  const body = (
    <>
      <span className="font-[family-name:var(--ap-display)] text-base text-[var(--ap-ink)] transition-colors group-hover:text-[var(--ap-gold)]">
        {author.name}
      </span>
      <span className="flex shrink-0 items-baseline gap-1 text-xs text-[var(--ap-ink-muted)]">
        <span className="font-semibold text-[var(--ap-gold)]">{author.bookCount}</span>
        {pluralize(author.bookCount, ["книга", "книги", "книг"])}
      </span>
    </>
  );
  const cardClass =
    "group flex items-baseline justify-between gap-4 self-start rounded-[var(--ap-radius-lg)] border border-[var(--ap-border)] bg-[var(--ap-surface)] p-4 transition-colors hover:border-[var(--ap-gold)]/40 hover:bg-[var(--ap-surface-raised)]";

  return author.slug ? (
    <Link to={`/authors/${author.slug}`} className={cardClass}>
      {body}
    </Link>
  ) : (
    <div className={cardClass}>{body}</div>
  );
}

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

        {/* Вместо .ap-section: компактный отступ сверху (крошки рядом с заголовком) */}
        <section className="mx-auto w-full max-w-6xl px-4 pt-6 pb-(--ap-section-gap) sm:px-6 lg:px-8">
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
                {shown.map((author) =>
                  author.heroImageUrl ? (
                    <AuthorPhotoCard key={author.id} author={author} />
                  ) : (
                    <AuthorCompactCard key={author.id} author={author} />
                  ),
                )}
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

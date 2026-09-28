// src/pages/AuthorPage/AuthorPage.tsx
// SEO-страница автора /authors/:slug — hero + каталог книг + рейтинги.
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { Spinner } from "@/components/Spinner";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";
import { Header } from "@/ui/Header";
import { Footer } from "@/ui/Footer";
import { useAuthorPage } from "./hooks/useAuthorPage";
import { buildAuthorSeoTitle, buildAuthorDescription } from "./seo";
import { getAuthorAffiliateLink } from "@/lib/affiliateLinks";
import type { AuthorBookCard } from "@/lib/authorsApi";

type BookSort = "year" | "rating";

/** Русские склонения: 1 книга / 2 книги / 5 книг */
function pluralRu(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

/** Хронология: по году издания (null — в конец), tie-break по названию */
function byYear(a: AuthorBookCard, b: AuthorBookCard): number {
  const ay = a.publishedYear ?? Number.POSITIVE_INFINITY;
  const by = b.publishedYear ?? Number.POSITIVE_INFINITY;
  if (ay !== by) return ay - by;
  return a.title.localeCompare(b.title, "ru");
}

/** По рейтингу: по убыванию (null — в конец), tie-break по названию */
function byRating(a: AuthorBookCard, b: AuthorBookCard): number {
  const ar = a.rating ?? Number.NEGATIVE_INFINITY;
  const br = b.rating ?? Number.NEGATIVE_INFINITY;
  if (ar !== br) return br - ar;
  return a.title.localeCompare(b.title, "ru");
}

/** Карточка книги: обложка, название, год/жанр, рейтинг (ссылка при наличии slug) */
function BookCard({ book }: { book: AuthorBookCard }) {
  const inner = (
    <>
      <img
        src={book.coverImageUrl}
        alt={book.title}
        loading="lazy"
        className="aspect-[2/3] w-full rounded border-2 border-black object-cover"
      />
      <h3 className="mt-2 text-sm font-bold text-[#f3efe6]">{book.title}</h3>
      <div className="mt-1 text-xs text-[#f3efe6]/60">
        {[book.publishedYear, book.genre].filter(Boolean).join(" · ")}
      </div>
      {book.rating !== null && (
        <div className="mt-1 text-xs font-bold text-[#f3efe6]">
          {book.rating.toFixed(1)} / 10
          <span className="font-normal text-[#f3efe6]/50">
            {" "}
            · {book.ratingsCount}{" "}
            {pluralRu(book.ratingsCount, ["оценка", "оценки", "оценок"])}
          </span>
        </div>
      )}
    </>
  );

  const className =
    "neo-brutalist-card block border-2 border-black bg-[#141a2a] p-3 transition-transform hover:-translate-y-0.5";

  return book.slug ? (
    <Link to={`/books/${book.slug}`} className={className}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}

export default function AuthorPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: page, isLoading, isError } = useAuthorPage(slug);
  const [sort, setSort] = useState<BookSort>("year");

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0e1a]">
        <Spinner size="xl" />
      </div>
    );
  }
  // 404 от API и любая ошибка сети — страница не найдена (не рендерим пустоту)
  if (isError || !page) return <NotFoundPage />;

  const { author, books } = page;
  const [cta] = getAuthorAffiliateLink(author.name);
  const genres = Array.from(
    new Set(books.map((b) => b.genre).filter((g): g is string => Boolean(g))),
  ).join(", ");
  const sorted = [...books].sort(sort === "year" ? byYear : byRating);

  return (
    <>
      <SEOHead
        title={buildAuthorSeoTitle(author.name)}
        description={buildAuthorDescription(author.seoDescription)}
        url={`/authors/${author.slug}`}
        image={books[0]?.coverImageUrl}
        breadcrumbs={[
          { name: "Главная", url: "/" },
          { name: author.name, url: `/authors/${author.slug}` },
        ]}
        person={{
          name: author.name,
          description: author.seoDescription,
          ...(genres ? { knowsAbout: genres } : {}),
        }}
      />

      <Header showSearch={false} />

      <div className="min-h-screen bg-[#0a0e1a] pb-24">
        <div className="mx-auto max-w-6xl px-4 pt-6">
          <Breadcrumbs
            theme="dark"
            items={[
              { label: "Главная", href: "/" },
              { label: author.name },
            ]}
          />

          {/* Hero */}
          <section className="neo-brutalist-card mt-6 border-4 border-black bg-[#f3efe6] p-6 shadow-[8px_8px_0_0_#000] md:p-8">
            <h1 className="text-4xl font-black text-[#0a0e1a] md:text-5xl">
              {author.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold text-[#0a0e1a]/70">
              <span>
                {author.bookCount}{" "}
                {pluralRu(author.bookCount, ["книга", "книги", "книг"])}
              </span>
              {author.avgRating !== null && (
                <span>Средний рейтинг {author.avgRating.toFixed(1)} / 10</span>
              )}
            </div>

            <p className="mt-4 max-w-3xl whitespace-pre-line text-base leading-relaxed text-[#0a0e1a]/85">
              {author.seoDescription}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={cta.url}
                target="_blank"
                rel="sponsored nofollow noopener"
                className="nb-btn-primary"
              >
                Читать книги автора
              </a>
            </div>

            <p className="mt-3 text-xs text-[#0a0e1a]/50">{cta.disclaimer}</p>
          </section>

          {/* Каталог книг с переключателями сортировки */}
          <section className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-black text-[#f3efe6]">Книги автора</h2>

              <div className="flex gap-2" role="group" aria-label="Сортировка книг">
                <button
                  type="button"
                  onClick={() => setSort("year")}
                  aria-pressed={sort === "year"}
                  className={
                    sort === "year"
                      ? "nb-btn-primary px-4 py-2 text-sm"
                      : "nb-btn-secondary px-4 py-2 text-sm"
                  }
                >
                  По порядку
                </button>
                <button
                  type="button"
                  onClick={() => setSort("rating")}
                  aria-pressed={sort === "rating"}
                  className={
                    sort === "rating"
                      ? "nb-btn-primary px-4 py-2 text-sm"
                      : "nb-btn-secondary px-4 py-2 text-sm"
                  }
                >
                  По рейтингу
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {sorted.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </section>

          {/* Лучшие книги (с ≥ 5 оценок) */}
          {page.topBooks.length > 0 && (
            <section className="mt-10">
              <h2 className="text-2xl font-black text-[#f3efe6]">Лучшие книги</h2>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {page.topBooks.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            </section>
          )}

          {/* Слабые книги (с ≥ 5 оценок) */}
          {page.bottomBooks.length > 0 && (
            <section className="mt-10">
              <h2 className="text-2xl font-black text-[#f3efe6]">Слабые книги</h2>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {page.bottomBooks.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            </section>
          )}

          {/* Тир-листы с книгами автора */}
          {page.tierLists.length > 0 && (
            <section className="mt-10">
              <h2 className="text-2xl font-black text-[#f3efe6]">
                В тир-листах ({page.tierLists.length})
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {page.tierLists.map((tl) => (
                  <Link
                    key={tl.id}
                    to={`/tier-lists/${tl.slug ?? tl.id}`}
                    className="nb-btn-secondary px-4 py-2 text-sm"
                  >
                    {tl.title}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}

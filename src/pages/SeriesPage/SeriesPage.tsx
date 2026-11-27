import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { Header } from "@/ui/Header";
import { Footer } from "@/ui/Footer";
import { MobileBottomNav } from "@/ui/MobileBottomNav";
import { Spinner } from "@/components/Spinner";
import { Icon } from "@/components/Icon";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";
import { getSeries } from "@/lib/seriesApi";
import { pluralize } from "@/utils/pluralize";
import { buildSeriesJsonLd, formatSeriesOrder } from "./seo";

export default function SeriesPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromBookSlug = searchParams.get("from");

  const { data: series, isLoading, isError, refetch } = useQuery({
    queryKey: ["series", slug],
    queryFn: () => getSeries(slug!),
    enabled: Boolean(slug),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#101418]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#101418] text-white">
        <p className="text-white/70">Не удалось загрузить страницу цикла</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="bg-amber-400 text-[#101418] font-semibold px-5 py-2.5 rounded-lg cursor-pointer"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (!series) {
    return <NotFoundPage />;
  }

  const heroCover = series.coverImageUrl || series.books[0]?.coverImageUrl || null;
  const booksCount = series.books.length;
  const isThinContent = booksCount < 2;

  const breadcrumbs = [
    { name: "Главная", url: "/" },
    ...(series.author?.slug
      ? [{ name: series.author.name, url: `/authors/${series.author.slug}` }]
      : []),
    { name: series.name, url: `/series/${series.slug}` },
  ];

  const metaDescription =
    series.description?.trim() ||
    `В каком порядке читать цикл (серию книг) «${series.name}»${
      series.author ? ` (${series.author.name})` : ""
    }: полный список книг по порядку на BookStrata.`;

  const jsonLd = buildSeriesJsonLd(series, heroCover);

  return (
    <div className="min-h-screen bg-[#101418] text-white flex flex-col">
      <SEOHead
        title={`${series.name} — все книги цикла по порядку`}
        description={metaDescription}
        image={heroCover ?? undefined}
        url={`/series/${series.slug}`}
        type="website"
        noindex={isThinContent}
        breadcrumbs={breadcrumbs}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <Header showSearch={false} />

      <main className="flex-1 pt-24 pb-20">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          {/* Назад + хлебные крошки */}
          <div className="flex items-center justify-between gap-4 mb-8">
            <button
              type="button"
              onClick={() =>
                window.history.length > 1 ? navigate(-1) : navigate("/")
              }
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm cursor-pointer"
            >
              <Icon name="arrow_back" className="text-lg" />
              Назад
            </button>
            <div className="hidden md:block">
              <Breadcrumbs
                items={breadcrumbs.map((b) => ({ label: b.name, href: b.url }))}
              />
            </div>
          </div>

          {/* Шапка цикла */}
          <header className="flex flex-col md:flex-row gap-6 md:gap-8 items-start mb-12 p-6 rounded-2xl border border-white/10 bg-white/3">
            {heroCover && (
              <div className="w-32 md:w-40 aspect-2/3 rounded-xl overflow-hidden border border-white/15 shrink-0 shadow-xl bg-black/40">
                <img
                  src={heroCover}
                  alt={series.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-widest text-amber-300/90 font-semibold mb-2">
                Цикл книг · порядок чтения
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-3">
                {series.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/70 mb-4">
                {series.author && (
                  <span>
                    Автор:{" "}
                    {series.author.slug ? (
                      <Link
                        to={`/authors/${series.author.slug}`}
                        className="text-amber-300 hover:underline underline-offset-4"
                      >
                        {series.author.name}
                      </Link>
                    ) : (
                      <span className="text-white/90">{series.author.name}</span>
                    )}
                  </span>
                )}
                {series.author && <span className="text-white/30">·</span>}
                <span>
                  {booksCount} {pluralize(booksCount, "книга", "книги", "книг")}
                </span>
              </div>
              {series.description && (
                <p className="text-[15px] leading-relaxed text-white/80 max-w-prose">
                  {series.description}
                </p>
              )}
            </div>
          </header>

          {/* Список книг цикла */}
          <section aria-label="Книги цикла по порядку">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6">
              В каком порядке читать
            </h2>

            {booksCount === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/2 p-8 text-center text-white/60">
                В цикле пока нет опубликованных книг.
              </div>
            ) : (
              <ol className="space-y-4">
                {series.books.map((book) => {
                  const isCurrent = Boolean(
                    fromBookSlug && book.slug && book.slug === fromBookSlug,
                  );
                  const bookHref = book.slug ? `/books/${book.slug}` : null;

                  return (
                    <li
                      key={book.id}
                      data-current={isCurrent ? "true" : undefined}
                      className={`group flex items-start gap-4 p-4 rounded-xl border transition-all ${
                        isCurrent
                          ? "border-amber-400/70 bg-amber-400/10 shadow-[0_0_24px_rgba(251,191,36,0.12)]"
                          : "border-white/10 bg-white/3 hover:border-white/25 hover:bg-white/5"
                      }`}
                    >
                      {/* Бейдж порядка */}
                      {book.seriesOrder != null && (
                        <div className="shrink-0 flex items-center justify-center min-w-11 h-9 px-2.5 rounded-lg bg-amber-400/15 border border-amber-400/35 text-amber-300 font-bold text-sm">
                          №{formatSeriesOrder(book.seriesOrder)}
                        </div>
                      )}

                      {/* Обложка */}
                      <div className="w-16 aspect-2/3 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/40">
                        {book.coverImageUrl ? (
                          <img
                            src={book.coverImageUrl}
                            alt={book.title}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-white/40 text-center px-1">
                            {book.title}
                          </div>
                        )}
                      </div>

                      {/* Метаданные книги */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {bookHref ? (
                            <Link
                              to={bookHref}
                              className="text-base md:text-lg font-semibold text-white group-hover:text-amber-300 transition-colors"
                            >
                              {book.title}
                            </Link>
                          ) : (
                            <span className="text-base md:text-lg font-semibold text-white">
                              {book.title}
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/40">
                              Текущая книга
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-white/65">
                          {book.author && <span>{book.author}</span>}
                          {book.publishedYear && <span>{book.publishedYear} г.</span>}
                          {book.genre && (
                            <span className="text-amber-300/80">{book.genre}</span>
                          )}
                          {book.rating != null && book.rating > 0 && (
                            <span className="inline-flex items-center gap-1 text-amber-300 font-medium">
                              ★ {book.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

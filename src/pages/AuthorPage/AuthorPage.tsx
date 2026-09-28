// src/pages/AuthorPage/AuthorPage.tsx
// SEO-страница автора /authors/:slug — hero + SEO-текст + партнёрская CTA.
// Каталог книг и блоки рейтингов добавляются задачами 8–9 плана.
import { useParams } from "react-router-dom";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { Spinner } from "@/components/Spinner";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";
import { Header } from "@/ui/Header";
import { Footer } from "@/ui/Footer";
import { useAuthorPage } from "./hooks/useAuthorPage";
import { buildAuthorSeoTitle, buildAuthorDescription } from "./seo";
import { getAuthorAffiliateLink } from "@/lib/affiliateLinks";

/** Русские склонения: 1 книга / 2 книги / 5 книг */
function pluralRu(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export default function AuthorPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: page, isLoading, isError } = useAuthorPage(slug);

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
        </div>
      </div>

      <Footer />
    </>
  );
}

// src/pages/AuthorPage/AuthorPage.tsx
// SEO-страница автора /authors/:slug — hero + секции ручного контента + рейтинги.
import { useParams } from "react-router-dom";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { Spinner } from "@/components/Spinner";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";
import { Header } from "@/ui/Header";
import { Footer } from "@/ui/Footer";
import { useAuthorPage } from "./hooks/useAuthorPage";
import { usePopularAuthors } from "./hooks/usePopularAuthors";
import { buildAuthorSeoTitle, buildAuthorDescription } from "./seo";
import { AuthorHero } from "./components/AuthorHero";
import { AuthorManifesto } from "./components/AuthorManifesto";
import { AuthorShowcase } from "./components/AuthorShowcase";
import { AuthorBibliography } from "./components/AuthorBibliography";
import { AuthorTopBottom } from "./components/AuthorTopBottom";
import { AuthorTierLists } from "./components/AuthorTierLists";
import { AuthorAdaptations } from "./components/AuthorAdaptations";
import { AuthorPress } from "./components/AuthorPress";
import { AuthorOtherAuthors } from "./components/AuthorOtherAuthors";
import { AuthorCta } from "./components/AuthorCta";
import "./AuthorPage.css";

export default function AuthorPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: page, isLoading, isError } = useAuthorPage(slug);
  // Хук должен вызываться до любых early return — иначе «Rendered more hooks»
  const { data: popularAuthors = [] } = usePopularAuthors(7);

  if (isLoading) {
    return (
      <div className="author-page flex min-h-screen items-center justify-center bg-[var(--ap-bg)]">
        <Spinner size="xl" />
      </div>
    );
  }
  // 404 от API и любая ошибка сети — страница не найдена (не рендерим пустоту)
  if (isError || !page) return <NotFoundPage />;

  const { author, books } = page;
  const genres = Array.from(
    new Set(books.map((b) => b.genre).filter((g): g is string => Boolean(g))),
  ).join(", ");

  // Перелинковка: популярные авторы без текущего
  const otherAuthors = popularAuthors
    .filter((a) => a.slug !== author.slug)
    .slice(0, 6);

  return (
    <>
      <SEOHead
        title={buildAuthorSeoTitle(author.name)}
        description={buildAuthorDescription(author.seoDescription)}
        url={`/authors/${author.slug}`}
        image={books[0]?.coverImageUrl}
        breadcrumbs={[
          { name: "Главная", url: "/" },
          { name: "Все авторы", url: "/authors" },
          { name: author.name, url: `/authors/${author.slug}` },
        ]}
        person={{
          name: author.name,
          description: author.seoDescription,
          ...(genres ? { knowsAbout: genres } : {}),
        }}
      />

      <Header showSearch={false} />

      {/* pt-20 — полоса под fixed-хедером (~80px): хиро не залезает под него */}
      <div className="author-page relative min-h-screen bg-[var(--ap-bg)] pb-24 pt-20">
        {/* Крошки поверх хиро (верх пустой, justify-end) — не сдвигают контент страницы.
            z-20 > z-10 у hero-обёртки — иначе её div перехватывает клики по ссылкам.
            pt-28 — воздух под хедером (~80px), чтобы крошки не прилипали к нему */}
        <div className="absolute inset-x-0 top-0 z-20 mx-auto max-w-6xl px-4 pt-28">
          <Breadcrumbs
            theme="dark"
            items={[
              { label: "Главная", href: "/" },
              { label: "Все авторы", href: "/authors" },
              { label: author.name },
            ]}
          />
        </div>

        {/* Порядок секций по спеке: Hero → Manifesto → Showcase → TopBottom → Bibliography → TierLists → Adaptations → Press → OtherAuthors → CTA */}
        <AuthorHero author={author} stats={page.stats} />
        <AuthorManifesto author={author} />
        <AuthorShowcase items={page.showcase} />
        <AuthorTopBottom top={page.topBooks} bottom={page.bottomBooks} />
        <AuthorBibliography books={page.books} />
        <AuthorTierLists lists={page.tierLists} />
        <AuthorAdaptations items={page.adaptations} />
        <AuthorPress items={page.pressQuotes} />
        <AuthorOtherAuthors authors={otherAuthors} />
        <AuthorCta />
      </div>

      <Footer />
    </>
  );
}

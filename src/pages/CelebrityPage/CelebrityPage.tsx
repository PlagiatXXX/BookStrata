import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BookOpen, Sparkles, Calendar, Quote } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { StaticTierView } from "@/components/StaticTierView";
import { BookViewModal } from "@/components/BookViewModal/BookViewModal";
import { AiLibrarianModal } from "@/components/AiLibrarian/AiLibrarianModal";
import { Spinner } from "@/components/Spinner";
import { getCelebrityBySlug, CELEBRITY_CATEGORIES } from "@/lib/celebritiesApi";
import type { Book } from "@/types";
import { proxyImageUrl } from "@/utils/imageProxy";
import "./CelebrityPage.css";

export default function CelebrityPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [viewedBook, setViewedBook] = useState<Book | null>(null);
  const [isAiOpen, setAiOpen] = useState(false);
  const handleAiOpen = useCallback(() => setAiOpen(true), []);
  const handleAiClose = useCallback(() => setAiOpen(false), []);

  const { data: celebrity, isLoading, error } = useQuery({
    queryKey: ["celebrity", slug],
    queryFn: () => getCelebrityBySlug(slug || ""),
    enabled: !!slug,
    retry: 1,
  });

  const handleViewBook = useCallback((book: Book) => {
    setViewedBook(book);
  }, []);

  // Статистика
  const books = celebrity?.books;
  const stats = useMemo(() => {
    if (!books) return { totalBooks: 0 };
    const bookList = Object.values(books) as Book[];
    return { totalBooks: bookList.length };
  }, [books]);

  const categoryLabel = celebrity ? (CELEBRITY_CATEGORIES[celebrity.category] || celebrity.category) : "";

  if (isLoading) {
    return (
      <DashboardLayout showSearch={false}>
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center justify-center py-12">
            <Spinner size="md" className="mr-2" />
            Загрузка...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !celebrity) {
    return (
      <DashboardLayout showSearch={false}>
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Знаменитость не найдена</h1>
            <button
              onClick={() => navigate("/celebrities")}
              className="text-(--accent-main) hover:underline cursor-pointer"
            >
              ← Все знаменитости
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <SEOHead
        title={`${celebrity.name} — что читает, любимые книги | BookStrata`}
        description={
          celebrity.biography
            ? `Узнайте, какие книги читает ${celebrity.name}. ${celebrity.biography.slice(0, 200)}`
            : `Любимые книги ${celebrity.name} — подборка книг, которые упоминала знаменитость в интервью.`
        }
        image={proxyImageUrl(celebrity.photoUrl) || undefined}
        url={`/celebrities/${slug}`}
      />

      <DashboardLayout showSearch={false}>
        <div className="px-4 sm:px-6 pt-6 pb-4 space-y-1">
          <Breadcrumbs
            items={[
              { label: "Знаменитости", href: "/celebrities" },
              { label: celebrity.name },
            ]}
          />
          <button
            onClick={() => navigate("/celebrities")}
            className="text-xs text-(--ink-2) hover:text-(--accent-main) transition-colors cursor-pointer"
          >
            ← Все знаменитости
          </button>
        </div>

        <article className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
          {/* Hero секция с фото */}
          <div className="celebrity-hero">
            <div className="celebrity-hero-photo">
              {celebrity.photoUrl ? (
                <img
                  src={proxyImageUrl(celebrity.photoUrl)}
                  alt={celebrity.name}
                  className="celebrity-hero-img"
                />
              ) : (
                <div className="celebrity-hero-placeholder">
                  {celebrity.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="celebrity-hero-info">
              <div className="celebrity-hero-tags">
                {categoryLabel && (
                  <span className="celebrity-hero-category">{categoryLabel}</span>
                )}
              </div>

              <h1 className="celebrity-hero-name">{celebrity.name}</h1>

              {stats.totalBooks > 0 && (
                <div className="celebrity-hero-stats">
                  <BookOpen size={16} />
                  <span>{stats.totalBooks} книг в подборке</span>
                </div>
              )}

              <div className="celebrity-hero-actions">
                <button
                  type="button"
                  onClick={handleAiOpen}
                  className="celebrity-hero-ai-btn"
                >
                  <Sparkles size={16} />
                  Спросить у Букстража
                </button>
              </div>
            </div>
          </div>

          {/* Биография */}
          {celebrity.biography && (
            <div className="celebrity-bio">
              <div className="celebrity-bio-header">
                <Quote size={16} />
                <span>О {celebrity.name}</span>
              </div>
              <p className="celebrity-bio-text">{celebrity.biography}</p>
            </div>
          )}

          {/* Тир-лист */}
          {celebrity.tiers && celebrity.tierOrder && celebrity.books && (
            <div className="mb-8">
              <h2 className="celebrity-section-title">
                Любимые книги {celebrity.name}
              </h2>
              <StaticTierView
                tiers={celebrity.tiers as Record<string, import("@/types").Tier>}
                tierOrder={celebrity.tierOrder}
                books={celebrity.books as Record<string, import("@/types").Book>}
                onViewBook={handleViewBook}
                unrankedBookIds={celebrity.unrankedBookIds}
              />
            </div>
          )}

          {/* Empty state — если нет книг */}
          {(!celebrity.tiers || !celebrity.books || Object.keys(celebrity.books).length === 0) && (
            <div className="celebrity-empty-books">
              <p className="text-(--ink-2) text-center py-12">
                Подборка книг скоро появится.
              </p>
            </div>
          )}

          {/* Дата обновления */}
          <div className="flex items-center gap-2 mt-8 text-sm text-(--ink-2)">
            <Calendar size={14} />
            <span>Обновлено: {new Date(celebrity.updatedAt).toLocaleDateString("ru-RU", {
              day: "numeric", month: "long", year: "numeric",
            })}</span>
          </div>
        </article>

        {/* Модалки */}
        <BookViewModal
          book={viewedBook}
          isOpen={!!viewedBook}
          onClose={() => setViewedBook(null)}
          isReadOnly
          hideThoughts
        />

        <AiLibrarianModal
          isOpen={isAiOpen}
          onClose={handleAiClose}
          context={{ pageType: 'celebrity', slug: slug || '' }}
        />
      </DashboardLayout>
    </>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useNavigate, useLocation, Link } from "react-router-dom";
import { Tag } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { BookViewModal } from "@/components/BookViewModal/BookViewModal";
import { sileo } from "sileo";
import { getCollectionBySlug, getCollectionPreviewBySlug } from "@/lib/collectionsApi";
import type { CollectionItem } from "@/types/collection";
import type { Book } from "@/types";
import { proxyImageUrl } from "@/utils/imageProxy";
import { COLLECTION_TITLES } from "@/data/collection-seo";
import { CATEGORIES } from "@/data/categories";
import { TAG_TO_CATEGORY } from "@/data/tag-to-category";
import { buildCollectionSeoDesc, buildCollectionSeoTitle } from "./seo";
import { useBookshelf } from "@/hooks/useBookshelf";
import { useAuth } from "@/hooks/useAuthContext";
import { getThemeById } from "@/themes/registry";
import { ThemeProvider } from "@/themes/ThemeProvider";
import { ThemeSection } from "@/themes/ThemeSection";
import { ThemeDecor } from "@/themes/ThemeDecor";
import { DefaultCollectionLayout } from "./DefaultCollectionLayout";
import "./CollectionPage.css";

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";
  const navigate = useNavigate();
  const location = useLocation();
  const cameFromApp = location.key !== "default";
  const redirectedRef = useRef(false);
  const [collection, setCollection] = useState<CollectionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewedBook, setViewedBook] = useState<Book | null>(null);
  const { shelf } = useBookshelf();
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.userId ?? null;

  const handleViewBook = useCallback((book: Book) => {
    setViewedBook(book);
  }, []);

  // Theme state (filters managed by themed section or default layout)
  const [filterGenre, setFilterGenre] = useState<string | null>(null);

  useEffect(() => {
    const loadCollection = async () => {
      if (!slug) return;

      try {
        const data = isPreview
          ? await getCollectionPreviewBySlug(slug)
          : await getCollectionBySlug(slug);
        if (!data) {
          sileo.error({
            title: "Коллекция не найдена",
            description: "Возможно, она была удалена",
            duration: 3000,
          });
          if (!redirectedRef.current) {
            redirectedRef.current = true;
            if (cameFromApp) {
              navigate(-1);
            } else {
              navigate("/rankings");
            }
          }
          return;
        }
        setCollection(data);
      } catch (error) {
        if (typeof window !== "undefined" && window.__PRERENDER__) {
          console.warn("[prerender] API недоступен, показываем SEO-заглушку");
        } else {
          console.error("Failed to load collection:", error);
          sileo.error({
            title: "Ошибка загрузки",
            description: "Не удалось загрузить коллекцию",
            duration: 3000,
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadCollection();
  }, [slug, navigate, isPreview, cameFromApp]);

  // SEO data — available even during loading/error for prerender
  const seoTitle = buildCollectionSeoTitle(collection?.title, slug || "", COLLECTION_TITLES[slug || ""] || "");
  const seoDesc = buildCollectionSeoDesc(collection?.excerpt, slug || "", seoTitle);
  const seoImage = collection?.coverImageUrl
    ? (proxyImageUrl(collection.coverImageUrl) || undefined)
    : undefined;
  const seoUrl = slug ? `/collections/${slug}` : undefined;

  const genreCategory =
    collection?.categoryId && collection.categoryId !== "all"
      ? CATEGORIES.find((c) => c.id === collection.categoryId)
      : undefined;

  const seoBreadcrumbs = slug
    ? [
        { name: "Главная", url: "/" },
        { name: "Рейтинги", url: "/rankings" },
        ...(genreCategory
          ? [{ name: genreCategory.label, url: `/topics/${genreCategory.id}` }]
          : []),
        { name: seoTitle || "Подборка", url: `/collections/${slug}` },
      ]
    : undefined;

  // Resolve theme config from DB field
  const themeConfig = collection?.theme ? getThemeById(collection.theme) : null;

  if (loading) {
    return (
      <>
        <SEOHead
          title={seoTitle}
          description={seoDesc}
          image={seoImage}
          url={seoUrl}
          breadcrumbs={seoBreadcrumbs}
        />
        <DashboardLayout showSearch={false}>
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="animate-pulse">
              <div className="h-4 bg-(--bg-1) rounded w-20 mb-4" />
              <div className="h-10 bg-(--bg-1) rounded w-3/4 mb-6" />
              <div className="h-4 bg-(--bg-1) rounded w-40 mb-8" />
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-4 bg-(--bg-1) rounded w-full" />
                ))}
              </div>
            </div>
          </div>
        </DashboardLayout>
      </>
    );
  }

  if (!collection) {
    return (
      <>
        <SEOHead
          title={seoTitle}
          description={seoDesc}
          image={seoImage}
          url={seoUrl}
          breadcrumbs={seoBreadcrumbs}
        />
        <DashboardLayout showSearch={false}>
          <div className="max-w-4xl mx-auto px-6 py-12 text-center">
            <h1 className="text-2xl font-bold mb-4">{seoTitle}</h1>
            <p className="text-(--ink-2)">Коллекция временно недоступна. Попробуйте обновить страницу.</p>
          </div>
        </DashboardLayout>
      </>
    );
  }

  return (
    <>
      {/* SEO — для пререндера и гидрации */}
      <SEOHead
        title={seoTitle}
        description={seoDesc}
        image={seoImage}
        url={seoUrl}
        publishedTime={collection.createdAt}
        dateModified={collection.updatedAt}
        author={collection.type === "curated" ? "Букстраж" : undefined}
        type={collection.type === "literary" ? "article" : "website"}
        breadcrumbs={seoBreadcrumbs}
      />

      <DashboardLayout
        showSearch={false}
      >
        {themeConfig ? (
          /* ── Themed layout ── */
          <ThemeProvider theme={themeConfig}>
            {themeConfig.decor && <ThemeDecor name={themeConfig.decor} />}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
              {/* Breadcrumbs */}
              <div className="pt-6 pb-4">
                <Breadcrumbs
                  theme="light"
                  items={[
                    { label: "Главная", href: "/" },
                    { label: "Рейтинги", href: "/rankings" },
                    ...(genreCategory
                      ? [{ label: genreCategory.label, href: `/topics/${genreCategory.id}` }]
                      : []),
                    { label: collection.title },
                  ]}
                />
                <button
                  onClick={() => navigate(-1)}
                  className="text-xs text-slate-500 hover:text-orange-600 transition-colors cursor-pointer mt-1"
                >
                  ← Назад к подборкам
                </button>
              </div>

              {themeConfig.sections.map((sectionType, index) => (
                <ThemeSection
                  key={`${sectionType}-${index}`}
                  type={sectionType}
                  collection={collection}
                  filterGenre={filterGenre ?? undefined}
                  onFilterGenreChange={(g) => setFilterGenre(g)}
                  onViewBook={handleViewBook}
                  statuses={shelf}
                  collectionSlug={collection.slug}
                  currentUserId={currentUserId}
                />
              ))}

              {/* Tags footer */}
              {collection.tags.length > 0 && (
                <footer className="mt-12 pt-8 border-t border-(--line-soft)">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag size={16} className="text-(--ink-1)" />
                    <span className="text-sm text-(--ink-1)">Теги:</span>
                    {collection.tags.map((tag) => {
                      const categoryId = TAG_TO_CATEGORY[tag];
                      if (categoryId) {
                        return (
                          <Link
                            key={tag}
                            to={`/topics/${categoryId}`}
                            className="text-sm text-(--accent-main) hover:text-(--accent-hover) transition-colors"
                          >
                            #{tag}
                          </Link>
                        );
                      }
                      return (
                        <span key={tag} className="text-sm text-(--accent-main)">
                          #{tag}
                        </span>
                      );
                    })}
                  </div>
                </footer>
              )}
            </div>
          </ThemeProvider>
        ) : (
          /* ── Default layout (no theme) ── */
          <DefaultCollectionLayout collection={collection} />
        )}
      </DashboardLayout>

      <BookViewModal
        book={viewedBook}
        isOpen={!!viewedBook}
        onClose={() => setViewedBook(null)}
        isReadOnly
        hideThoughts
      />
    </>
  );
}

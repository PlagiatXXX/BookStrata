import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Tag, GitFork } from "lucide-react";
import DOMPurify from "dompurify";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { CuratedTierView } from "@/components/CuratedTierView";
import { BookViewModal } from "@/components/BookViewModal/BookViewModal";
import { useAuth } from "@/hooks/useAuthContext";
import { sileo } from "sileo";
import { getCollectionBySlug } from "@/lib/collectionsApi";
import type { CollectionItem } from "@/lib/collectionsApi";
import type { Book } from "@/types";
import { proxyImageUrl } from "@/utils/imageProxy";
import "./CollectionPage.css";

export function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [collection, setCollection] = useState<CollectionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewedBook, setViewedBook] = useState<Book | null>(null);

  const currentUserId = authUser?.userId ?? null;

  useEffect(() => {
    const loadCollection = async () => {
      if (!slug) return;

      try {
        const data = await getCollectionBySlug(slug);
        if (!data) {
          sileo.error({
            title: "Коллекция не найдена",
            description: "Возможно, она была удалена",
            duration: 3000,
          });
          navigate("/community");
          return;
        }
        setCollection(data);
      } catch (error) {
        console.error("Failed to load collection:", error);
        sileo.error({
          title: "Ошибка загрузки",
          description: "Не удалось загрузить коллекцию",
          duration: 3000,
        });
        navigate("/community");
      } finally {
        setLoading(false);
      }
    };

    loadCollection();
  }, [slug, navigate]);

  const handleViewBook = useCallback((book: Book) => {
    setViewedBook(book);
  }, []);

  const handleFork = useCallback(() => {
    if (!currentUserId) {
      sileo.action({
        title: 'Создайте свою версию',
        description: 'Зарегистрируйтесь, чтобы копировать любые подборки и редактировать их под себя.',
        duration: 10000,
        button: {
          title: 'Создать аккаунт',
          onClick: () => navigate('/auth?mode=register'),
        },
      });
      return;
    }
    sileo.info({
      title: 'Скоро',
      description: 'Возможность копировать подборки появится в ближайшее время',
      duration: 5000,
    });
  }, [currentUserId, navigate]);

  const sanitizedContent = useMemo(() => {
if (!collection?.content) return "";
return DOMPurify.sanitize(collection.content);
}, [collection?.content]);

  if (loading) {
    return (
      <DashboardLayout
        showTemplatesNav={false}
        showSearch={false}
        activeItem="Новости"
      >
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
    );
  }

  if (!collection) {
    return null;
  }

  return (
    <>
      <SEOHead
        title={collection.title}
        description={collection.excerpt || `Подборка "${collection.title}" на BookStrata`}
        image={proxyImageUrl(collection.coverImageUrl) || undefined}
        url={`/collections/${slug}`}
        breadcrumbs={[{ name: "Подборки", url: "/community" }, { name: collection.title, url: `/collections/${slug}` }]}
      />
      <DashboardLayout
      showTemplatesNav={false}
      showSearch={false}
      activeItem="Новости"
    >
      {/* Breadcrumbs + Назад — на левый край */}
      <div className="px-6 pt-6 pb-4 space-y-1">
        <Breadcrumbs items={[{ label: "Подборки", href: "/community" }, { label: collection.title }]} />
        <button
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/community');
            }
          }}
          className="text-xs text-(--ink-2) hover:text-(--accent-main) transition-colors cursor-pointer"
        >
          ← Назад к подборкам
        </button>
      </div>

      <article className="max-w-4xl mx-auto px-6 pb-12">
        {/* Header — как в публичном тир-листе: ряд (название по центру | кнопка справа) */}
        <header className="mb-8">
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:gap-6">
            {/* Название по центру */}
            <div className="min-w-0 flex-1 text-center">
              <h1 className="community-heading text-2xl font-black leading-tight sm:text-3xl md:text-4xl">
                {collection.title}
              </h1>
              {collection.type === "curated" && (
                <div className="flex items-center justify-center gap-1 text-sm text-(--ink-1) mt-2">
                  <span>автор:</span>
                  <span className="text-(--accent-main)">Букстраж</span>
                </div>
              )}
            </div>

            {/* Fork button справа */}
            {collection.type === "curated" && (
              <div className="shrink-0">
                <button
                  onClick={handleFork}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-white text-black border-2 border-black shadow-[4px_4px_0_0_var(--accent-main)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-100 cursor-pointer"
                  title={currentUserId ? 'Создать свою версию' : 'Войдите, чтобы скопировать'}
                >
                  <GitFork size={18} />
                  Своя версия
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Tier list for curated collections — на всю ширину */}
        {collection.type === "curated" && collection.tiers && collection.tierOrder && collection.books && (
          <div className="full-width-tier-list mb-8">
            <CuratedTierView
              tiers={collection.tiers as Record<string, import("@/types").Tier>}
              tierOrder={collection.tierOrder}
              books={collection.books as Record<string, import("@/types").Book>}
              onViewBook={handleViewBook}
            />
          </div>
        )}

        {/* Excerpt */}
        {collection.excerpt && (
          <div className="brutal-card brutal-border p-6 mb-8">
            <p className="text-lg font-medium text-(--ink-0) leading-relaxed">
              {collection.excerpt}
            </p>
          </div>
        )}

        {/* Content — only for literary collections */}
        {collection.type === "literary" && sanitizedContent && (
          <div className="prose prose-invert max-w-none">
            <div
              className="collection-content text-(--ink-1) text-base leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          </div>
        )}

        {/* Book View Modal */}
        <BookViewModal
          book={viewedBook}
          isOpen={!!viewedBook}
          onClose={() => setViewedBook(null)}
          isReadOnly
          hideThoughts
        />

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-(--line-soft)">
          <div className="flex items-center gap-2 flex-wrap">
            <Tag size={16} className="text-(--ink-1)" />
            <span className="text-sm text-(--ink-1)">Теги:</span>
            {collection.tags.map((tag) => (
              <span key={tag} className="text-sm text-(--accent-main)">
                #{tag}
              </span>
            ))}
          </div>
        </footer>
      </article>
    </DashboardLayout>
    </>
  );
}

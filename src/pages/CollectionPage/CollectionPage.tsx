import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, Tag, GitFork } from "lucide-react";
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
      <article className="max-w-4xl mx-auto px-6 py-12">
        <Breadcrumbs items={[{ label: "Подборки", href: "/community" }, { label: collection.title }]} />

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {collection.tags.map((tag) => (
              <span
                key={tag}
                className="brutal-label px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="community-heading text-2xl font-black leading-tight mb-6 sm:text-3xl md:text-4xl">
            {collection.title}
          </h1>

          <div className="flex items-center gap-6 text-sm text-(--ink-1)">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>
                {new Date(collection.updatedAt).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Fork button for curated collections */}
          {collection.type === "curated" && (
            <div className="mt-4">
              <button
                onClick={handleFork}
                className="nb-btn-primary flex items-center gap-1.5"
                title={currentUserId ? 'Создать свою версию' : 'Войдите, чтобы скопировать'}
              >
                <GitFork size={18} />
                Своя версия
              </button>
            </div>
          )}
        </header>

        {/* Book Covers */}
        {collection.bookCovers && collection.bookCovers.length > 0 && (
          <div className="brutal-card brutal-border p-6 mb-8">
            <h2 className="text-lg font-bold text-(--ink-0) mb-4">
              Книги подборки
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {collection.bookCovers.map((cover, idx) => (
                <div
                  key={idx}
                  className="aspect-2/3 bg-(--bg-0) rounded-sm overflow-hidden border border-(--line-soft)"
                >
                  <img
                    src={cover}
                    alt={`Книга ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = '/images/books/placeholder.svg' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tier list for curated collections */}
        {collection.type === "curated" && collection.tiers && collection.tierOrder && collection.books && (
          <div className="brutal-card brutal-border p-6 mb-8">
            <h2 className="text-lg font-bold text-(--ink-0) mb-4">
              Рейтинг книг
            </h2>
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

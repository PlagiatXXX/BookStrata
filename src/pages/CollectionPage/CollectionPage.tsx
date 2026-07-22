import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Tag, Calendar, BookOpen, Sparkles } from "lucide-react";
import DOMPurify from "dompurify";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { Helmet } from "react-helmet-async";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { StaticTierView } from "@/components/StaticTierView";
import { BookViewModal } from "@/components/BookViewModal/BookViewModal";
import { AiLibrarianModal } from "@/components/AiLibrarian/AiLibrarianModal";
import { useAuth } from "@/hooks/useAuthContext";
import { useReadStatus } from "@/hooks/useReadStatus";
import { sileo } from "sileo";
import { getCollectionBySlug, getCollectionPreviewBySlug } from "@/lib/collectionsApi";
import type { CollectionItem } from "@/types/collection";
import type { Book } from "@/types";
import { proxyImageUrl } from "@/utils/imageProxy";
import { COLLECTION_SEO, COLLECTION_TITLES } from "@/data/collection-seo";
import "./CollectionPage.css";

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [collection, setCollection] = useState<CollectionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewedBook, setViewedBook] = useState<Book | null>(null);
  const [isAiOpen, setAiOpen] = useState(false);
  const handleAiOpen = useCallback(() => setAiOpen(true), []);
  const handleAiClose = useCallback(() => setAiOpen(false), []);

  const currentUserId = authUser?.userId ?? null;
  const [filterGenre, setFilterGenre] = useState<string | null>(null);

  const { statuses, toggleStatus, markedCount } = useReadStatus(slug);

  // Тост-фидбек при отметке прочитанного
  const prevStatusesRef = useRef(statuses);
  useEffect(() => {
    const prev = prevStatusesRef.current;
    for (const bookId of Object.keys(statuses)) {
      if (!(bookId in prev)) {
        sileo.success({ title: "✓ Добавлено в прочитанные", duration: 2000 });
      }
    }
    // Книга убрана из статусов — ничего не показываем
    prevStatusesRef.current = statuses;
  }, [statuses]);

  // Уникальные жанры из книг коллекции
  const genres = useMemo(() => {
    if (!collection?.books) return [];
    const bookList = Object.values(collection.books) as Book[];
    const genreSet = new Set<string>();
    bookList.forEach((book) => {
      if (book.genre) genreSet.add(book.genre);
    });
    return Array.from(genreSet).sort();
  }, [collection?.books]);

  // Статистика коллекции
  const stats = useMemo(() => {
    if (!collection?.books) return { totalBooks: 0 };
    const bookList = Object.values(collection.books) as Book[];
    return {
      totalBooks: bookList.length,
    };
  }, [collection?.books]);

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
          navigate("/community");
          return;
        }
        setCollection(data);
      } catch (error) {
        // Ошибка API (сеть, таймаут, бэкенд недоступен) — при пререндеринге
        // не редиректим, а показываем страницу с SEO-данными из slug.
        // Это гарантирует, что пререндерер сохранит корректные meta-теги,
        // а при гидрации React дозагрузит данные.
        if (typeof window !== 'undefined' && window.__PRERENDER__) {
          console.warn('[prerender] API недоступен, показываем SEO-заглушку');
        } else {
          console.error("Failed to load collection:", error);
          sileo.error({
            title: "Ошибка загрузки",
            description: "Не удалось загрузить коллекцию",
            duration: 3000,
          });
        }
        // Даже при ошибке показываем страницу с SEO-данными (пререндер)
        // вместо редиректа на /community
      } finally {
        setLoading(false);
      }
    };

    loadCollection();
  }, [slug, navigate, isPreview]);

  const handleViewBook = useCallback((book: Book) => {
    setViewedBook(book);
  }, []);

  const handleFork = useCallback(() => {
    if (!currentUserId) {
      sileo.action({
        title: 'Сохраните свою версию',
        description: 'Зарегистрируйтесь, чтобы создать свой рейтинг и сохранить его в личной библиотеке.',
        duration: 10000,
        button: {
          title: 'Создать аккаунт',
          onClick: () => navigate('/auth?mode=register'),
        },
      });
      return;
    }
    const readIds = Object.keys(statuses);
    const params = new URLSearchParams();
    params.set('fork', slug || '');
    if (readIds.length > 0) {
      params.set('readIds', readIds.join(','));
    }
    window.location.href = `/tier-lists/new?${params.toString()}`;
  }, [currentUserId, navigate, slug, statuses]);

  const sanitizedContent = useMemo(() => {
if (!collection?.content) return "";
return DOMPurify.sanitize(collection.content);
}, [collection?.content]);

  // SEO — всегда, даже при загрузке/ошибке, чтобы prerender гарантированно
  // захватил meta-теги. Пока данные не загружены — используем slug из URL.
  // Пока данные не загружены — используем читаемый заголовок из COLLECTION_TITLES
  const seoTitle = collection?.title || COLLECTION_TITLES[slug || ''] || slug || '';
  const seoDesc = COLLECTION_SEO[slug || '']
    || collection?.excerpt
    || `Подборка "${seoTitle}" на BookStrata — лучшие книги по жанру, рейтинг и рекомендации читателей`;
  const seoImage = collection?.coverImageUrl
    ? (proxyImageUrl(collection.coverImageUrl) || undefined)
    : undefined;
  const seoUrl = slug ? `/collections/${slug}` : undefined;
  const seoBreadcrumbs = slug
    ? [
        { name: "Главная", url: "/" },
        { name: "Подборки", url: "/community" },
        { name: seoTitle || "Подборка", url: `/collections/${slug}` },
      ]
    : undefined;

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
        <DashboardLayout
          showSearch={false}
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
      </>
    );
  }

  if (!collection) {
    // Коллекция не загрузилась (API недоступен) — показываем SEO-заглушку
    // с данными из slug. При пререндеринге бот получит корректные meta-теги,
    // а пользователь увидит сообщение о недоступности.
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
      {/* Book JSON-LD для каждой книги в коллекции */}
      {collection.books && (
        <Helmet>
          {Object.values(collection.books).map((book) => (
            <script key={book.id} type="application/ld+json">
              {JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Book",
                name: book.title,
                author: book.author
                  ? { "@type": "Person", name: book.author }
                  : undefined,
                image: proxyImageUrl(book.coverImageUrl),
                ...(book.description
                  ? { description: book.description }
                  : {}),
                ...(book.genre ? { genre: book.genre } : {}),
              })}
            </script>
          ))}
        </Helmet>
      )}

      <DashboardLayout
      showSearch={false}
    >
      {/* Breadcrumbs + Назад — на левый край */}
      <div className="px-4 sm:px-6 pt-6 pb-4 space-y-1">
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

      <article className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
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
            {/* Кнопка AI-библиотекаря */}
            <button
              type="button"
              onClick={handleAiOpen}
              className="inline-flex items-center gap-2 rounded border-2 border-(--accent-main) bg-(--accent-main)/10 px-4 py-2 text-sm font-bold text-(--accent-main) transition-all hover:bg-(--accent-main)/20 cursor-pointer"
            >
              <Sparkles size={16} />
              Спросить у Букстража
            </button>
          </div>
        </header>

        {/* Статистика + фильтр жанров */}
        {collection.type === "curated" && (
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-(--ink-2)">
              <BookOpen size={16} />
              <span>{stats.totalBooks} книг</span>
            </div>
            {genres.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setFilterGenre(null)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                    filterGenre === null
                      ? "bg-(--accent-main) text-white border-(--accent-main)"
                      : "border-(--line-soft) text-(--ink-2) hover:border-(--accent-main)"
                  }`}
                >
                  Все
                </button>
                {genres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setFilterGenre(genre)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                      filterGenre === genre
                        ? "bg-(--accent-main) text-white border-(--accent-main)"
                        : "border-(--line-soft) text-(--ink-2) hover:border-(--accent-main)"
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Editorial note — как составлялась подборка */}
        {collection.editorialNote && (
          <div className="brutal-card brutal-border p-6 mb-8">
            <h2 className="text-lg font-black tracking-tight mb-3 uppercase">Как составлялась подборка</h2>
            <p className="text-base text-(--ink-1) leading-relaxed">
              {collection.editorialNote}
            </p>
          </div>
        )}

        {/* Value callout — пока нет отметок, над тир-листом */}
        {collection.type === "curated" && markedCount === 0 && (
          <div className="brutal-card brutal-border p-5 mb-8 border-l-4" style={{ borderLeftColor: "var(--accent-main)" }}>
            <p className="text-sm text-(--ink-1) leading-relaxed">
              <span className="font-bold">Отмечайте книги, которые читали</span> —{' '}
              нажмите на плашку <span className="text-(--ink-0)">+ Отметить</span> внизу обложки.{' '}
              Потом сможете собрать свой рейтинг из отмеченных книг.
            </p>
          </div>
        )}

        {/* Tier list for curated collections — на всю ширину */}
        {collection.type === "curated" && collection.tiers && collection.tierOrder && collection.books && (
          <div className="mb-8">
            <StaticTierView
              tiers={collection.tiers as Record<string, import("@/types").Tier>}
              tierOrder={collection.tierOrder}
              books={collection.books as Record<string, import("@/types").Book>}
              onViewBook={handleViewBook}
              filterGenre={filterGenre}
              statuses={statuses}
              onToggleStatus={toggleStatus}
              unrankedBookIds={collection.unrankedBookIds}
            />
          </div>
        )}

        {/* CTA — когда есть отметки, под тир-листом */}
        <div className="overflow-hidden transition-all duration-500 ease-in-out" style={{ maxHeight: collection.type === "curated" && markedCount > 0 ? '500px' : '0px' }}>
          <div
            className="overflow-hidden transition-all duration-500 ease-in-out"
            style={{ maxHeight: collection.type === "curated" && markedCount > 0 ? '500px' : '0px', opacity: collection.type === "curated" && markedCount > 0 ? 1 : 0 }}
          >
            <div className="brutal-card brutal-border p-6 mb-8 text-center">
              {markedCount >= 4 ? (
                <>
                  <p className="text-lg font-bold mb-2">
                    Не согласны с этим рейтингом?
                  </p>
                  <p className="text-sm text-(--ink-2) mb-4">
                    Вы читали {markedCount} из {stats.totalBooks} книг этой подборки —{' '}
                    у вас уже есть своё мнение. Расставьте их по своим уровням.
                  </p>
                  <button
                    onClick={handleFork}
                    className="inline-flex items-center gap-1.5 px-6 py-3 text-sm font-bold uppercase tracking-wider bg-white text-black border-2 border-black shadow-[4px_4px_0_0_var(--accent-main)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-100 cursor-pointer"
                  >
                    Составить свой рейтинг
                  </button>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold mb-2">
                    Не согласны с этим рейтингом?
                  </p>
                  <p className="text-sm text-(--ink-2) mb-4">
                    Отмечено {markedCount} из {stats.totalBooks} книг. Отмечайте дальше или{' '}
                    сразу соберите свой рейтинг.
                  </p>
                  <button
                    onClick={handleFork}
                    className="inline-flex items-center gap-1.5 px-6 py-2 text-sm font-medium uppercase tracking-wider bg-white text-black border-2 border-black shadow-[4px_4px_0_0_var(--accent-main)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-100 cursor-pointer"
                  >
                    Составить свой рейтинг
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Excerpt */}
        {collection.excerpt && (
          <div className="brutal-card brutal-border p-6 mb-8">
            <p className="text-lg font-medium text-(--ink-0) leading-relaxed">
              {collection.excerpt}
            </p>
          </div>
        )}

        {/* Last updated */}
        <div className="flex items-center gap-2 mb-8 text-sm text-(--ink-2)">
          <Calendar size={14} />
          <span>Обновлено: {new Date(collection.updatedAt).toLocaleDateString("ru-RU", {
            day: "numeric", month: "long", year: "numeric",
          })}</span>
        </div>

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

        <AiLibrarianModal
          isOpen={isAiOpen}
          onClose={handleAiClose}
          context={{ pageType: 'collection', slug }}
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

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Tag, Calendar, BookOpen } from "lucide-react";
import DOMPurify from "dompurify";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { StaticTierView } from "@/components/StaticTierView";
import { BookViewModal } from "@/components/BookViewModal/BookViewModal";
import { useAuth } from "@/hooks/useAuthContext";
import { useReadStatus } from "@/hooks/useReadStatus";
import { sileo } from "sileo";
import { getCollectionBySlug, getCollectionPreviewBySlug } from "@/lib/collectionsApi";
import type { CollectionItem } from "@/lib/collectionsApi";
import type { Book } from "@/types";
import { proxyImageUrl } from "@/utils/imageProxy";
import "./CollectionPage.css";

export function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [collection, setCollection] = useState<CollectionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewedBook, setViewedBook] = useState<Book | null>(null);

  const currentUserId = authUser?.userId ?? null;
  const [filterGenre, setFilterGenre] = useState<string | null>(null);

  const { statuses, toggleStatus, readCount, totalMarked } = useReadStatus(slug);

  // Тост-фидбек при переключении статуса книги
  const prevStatusesRef = useRef(statuses);
  useEffect(() => {
    const prev = prevStatusesRef.current;
    for (const bookId of Object.keys(statuses)) {
      if (statuses[bookId] !== prev[bookId]) {
        const labels = {
          read: { title: "✓ Добавлено в прочитанные", color: "text-green-400" },
          reading: { title: "📖 В процессе чтения", color: "text-sky-400" },
          want: { title: "★ В списке желаемого", color: "text-amber-400" },
        };
        const label = labels[statuses[bookId]];
        if (label) {
          sileo.success({ title: label.title, duration: 2500 });
        }
      }
    }
    // Проверяем, что удалили (книга убрана из статусов)
    for (const bookId of Object.keys(prev)) {
      if (!(bookId in statuses)) {
        // Статус снят — ничего не показываем (или мягкое уведомление)
      }
    }
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
    window.location.href = `/tier-lists/new?fork=${slug || ""}`;
  }, [currentUserId, navigate, slug]);

  const sanitizedContent = useMemo(() => {
if (!collection?.content) return "";
return DOMPurify.sanitize(collection.content);
}, [collection?.content]);

  if (loading) {
    return (
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
      showSearch={false}
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

        {/* Value callout — Зачем отмечать книги (только для новых посетителей) */}
        {collection.type === "curated" && totalMarked === 0 && (
          <div className="brutal-card brutal-border p-5 mb-8 border-l-4" style={{ borderLeftColor: "var(--accent-main)" }}>
            <p className="text-sm text-(--ink-1) leading-relaxed">
              <span className="font-bold">Нажимайте на плашку внизу книги</span>, чтобы отметить статус: прочитал, читаю сейчас или в планах.{' '}
              Отмеченные книги сохранятся в вашей личной библиотеке.
            </p>
          </div>
        )}

        {/* Tier list for curated collections — на всю ширину */}
        {collection.type === "curated" && collection.tiers && collection.tierOrder && collection.books && (
          <div className="full-width-tier-list mb-8">
            <StaticTierView
              tiers={collection.tiers as Record<string, import("@/types").Tier>}
              tierOrder={collection.tierOrder}
              books={collection.books as Record<string, import("@/types").Book>}
              onViewBook={handleViewBook}
              filterGenre={filterGenre}
              statuses={statuses}
              onToggleStatus={toggleStatus}
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

        {/* CTA — адаптивный, в зависимости от числа отмеченных книг */}
        {collection.type === "curated" && totalMarked > 0 && (
          <div className="brutal-card brutal-border p-6 mt-8 text-center">
            {readCount >= 4 ? (
              <>
                <p className="text-lg font-bold mb-2">
                  Вы уже читали {readCount} из {stats.totalBooks} книг этой подборки
                </p>
                <p className="text-sm text-(--ink-2) mb-4">
                  Интересно, насколько ваш рейтинг отличается от редакционного?
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
                  Уже начали собирать свою библиотеку
                </p>
                <p className="text-sm text-(--ink-2) mb-4">
                  Отмеченные книги сохранятся. Продолжите отмечать или создайте свой рейтинг.
                </p>
                <button
                  onClick={handleFork}
                  className="inline-flex items-center gap-1.5 px-6 py-3 text-sm font-bold uppercase tracking-wider bg-white text-black border-2 border-black shadow-[4px_4px_0_0_var(--accent-main)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-100 cursor-pointer"
                >
                  Продолжить
                </button>
              </>
            )}
          </div>
        )}
      </article>
    </DashboardLayout>
    </>
  );
}

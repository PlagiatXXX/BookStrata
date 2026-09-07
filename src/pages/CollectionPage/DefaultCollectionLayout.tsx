import { useState, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Tag, Calendar, BookOpen } from "lucide-react";
import DOMPurify from "dompurify";
import { Helmet } from "react-helmet-async";

import { StaticTierView } from "@/components/StaticTierView";
import { BookViewModal } from "@/components/BookViewModal/BookViewModal";
import { AiLibrarianModal } from "@/components/AiLibrarian/AiLibrarianModal";
import { NotesBlock } from "./NotesBlock";
import { InteractiveShelfBlock } from "./InteractiveShelfBlock";
import { CollectionCard } from "@/components/CommunityComponents/CollectionCard";
import { useAuth } from "@/hooks/useAuthContext";
import { useBookshelf } from "@/hooks/useBookshelf";
import { sileo } from "sileo";
import { getCollections } from "@/lib/collectionsApi";
import type { CollectionItem } from "@/types/collection";
import type { Book } from "@/types";
import { proxyImageUrl } from "@/utils/imageProxy";
import { CATEGORIES } from "@/data/categories";
import { TAG_TO_CATEGORY } from "@/data/tag-to-category";
import { pickRelatedCollections } from "./related";

interface DefaultCollectionLayoutProps {
  collection: CollectionItem;
}

export function DefaultCollectionLayout({ collection }: DefaultCollectionLayoutProps) {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { shelf, slugShelf } = useBookshelf();
  const [viewedBook, setViewedBook] = useState<Book | null>(null);
  const [isAiOpen, setAiOpen] = useState(false);
  const [shelfFilter, setShelfFilter] = useState<"all" | "planned">("all");

  const currentUserId = authUser?.userId ?? null;

  const handleAiOpen = useCallback(() => setAiOpen(true), []);
  const handleAiClose = useCallback(() => setAiOpen(false), []);

  const statuses = useMemo(() => {
    const result: Record<string, string> = {};
    for (const [bookId, status] of Object.entries(shelf)) {
      if (status === "read") result[bookId] = "read";
    }
    return result;
  }, [shelf]);

  const markedCount = Object.keys(statuses).length;

  const stats = useMemo(() => {
    if (!collection.books) return { totalBooks: 0 };
    const bookList = Object.values(collection.books) as Book[];
    return { totalBooks: bookList.length };
  }, [collection.books]);

  // Фильтрация книг по статусу полки для tier view
  const filteredBooks = useMemo(() => {
    if (!collection.books || shelfFilter === "all") return collection.books;
    const result: Record<string, Book> = {};
    for (const [key, book] of Object.entries(collection.books)) {
      const b = book as Book;
      if (b.slug && slugShelf[b.slug] === "want_to_read") {
        result[key] = b;
      }
    }
    return result;
  }, [collection.books, shelfFilter, slugShelf]);

  const { data: allCollections = [] } = useQuery({
    queryKey: ["all-collections"],
    queryFn: getCollections,
    staleTime: 60 * 1000,
    retry: 2,
  });

  const relatedCollections = useMemo(
    () => pickRelatedCollections(collection, allCollections, 6),
    [collection, allCollections],
  );

  const handleViewBook = useCallback((book: Book) => {
    setViewedBook(book);
  }, []);

  const handleFork = useCallback(() => {
    if (!currentUserId) {
      sileo.action({
        title: "Сохраните свою версию",
        description: "Зарегистрируйтесь, чтобы создать свой рейтинг и сохранить его в личной библиотеке.",
        duration: 10000,
        button: {
          title: "Создать аккаунт",
          onClick: () => navigate(`/auth?mode=register&redirect=${encodeURIComponent(`/collections/${collection.slug}`)}`),
        },
      });
      return;
    }
    const readIds = Object.keys(statuses);
    const params = new URLSearchParams();
    params.set("fork", collection.slug || "");
    if (readIds.length > 0) {
      params.set("readIds", readIds.join(","));
    }
    window.location.href = `/tier-lists/new?${params.toString()}`;
  }, [currentUserId, navigate, collection.slug, statuses]);

  const sanitizedContent = useMemo(() => {
    if (!collection.content) return "";
    return DOMPurify.sanitize(collection.content);
  }, [collection.content]);

  const genreCategory =
    collection.categoryId && collection.categoryId !== "all"
      ? CATEGORIES.find((c) => c.id === collection.categoryId)
      : undefined;

  return (
    <>
      <Helmet>
        {collection.books && Object.keys(collection.books).length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: collection.title,
              description: collection.excerpt || "",
              url: `${import.meta.env.VITE_SITE_URL || "https://bookstrata.ru"}/collections/${collection.slug}`,
              numberOfItems: Object.keys(collection.books).length,
              itemListElement: Object.values(collection.books).map((book, index) => ({
                "@type": "ListItem",
                position: index + 1,
                item: {
                  "@type": "Book",
                  name: book.title,
                  author: book.author
                    ? { "@type": "Person", name: book.author }
                    : undefined,
                  image: proxyImageUrl(book.coverImageUrl),
                  ...(book.description ? { description: book.description } : {}),
                  ...(book.genre ? { genre: book.genre } : {}),
                },
              })),
            })}
          </script>
        )}
      </Helmet>

      {/* Main container with padding (except tier list) */}
      <div className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs + Назад */}
        <div
          className="pt-4 sm:pt-6 pb-3 sm:pb-4 flex flex-wrap items-center justify-between gap-2 sm:gap-3"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '0.8125rem' }}
        >
          <nav className="flex items-center flex-wrap gap-1.5 sm:gap-2" style={{ color: '#d8c3ad' }}>
            <a href="/" className="hover:text-[#f59e0b] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] sm:text-[16px]">home</span>
              <span className="hidden sm:inline">Главная</span>
            </a>
            <span style={{ color: '#534434' }}>/</span>
            <a href="/rankings" className="hover:text-[#f59e0b] transition-colors">Рейтинги</a>
            <span style={{ color: '#534434' }}>/</span>
            {genreCategory && (
              <>
                <a href={`/topics/${genreCategory.id}`} className="hover:text-[#f59e0b] transition-colors">{genreCategory.label}</a>
                <span style={{ color: '#534434' }}>/</span>
              </>
            )}
            <span className="truncate max-w-[150px] sm:max-w-[340px]" style={{ color: '#dfe2f1' }}>{collection.title}</span>
          </nav>

          <a
            href="#"
            onClick={(e) => { e.preventDefault(); navigate(-1); }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full transition-all duration-300 shadow-sm backdrop-blur-md group"
            style={{
              background: 'rgba(23, 27, 38, 0.7)',
              color: '#d8c3ad'
            }}
          >
            <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '0.8125rem' }}>Назад к подборкам</span>
          </a>
        </div>

        {/* Header */}
        <header className="mt-4 sm:mt-space-md mb-6 sm:mb-space-2xl">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-space-xl">
            <div className="max-w-3xl flex flex-col">
              {collection.type === "curated" && (
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.5625rem] font-bold tracking-widest uppercase"
                    style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: '#f59e0b',
                      fontFamily: "'Plus Jakarta Sans', sans-serif"
                    }}
                  >
                    <span className="material-symbols-outlined text-[14px]">stars</span>
                    КУРАТОРСКИЙ ВЫБОР 2026
                  </span>
                </div>
              )}
              <h1
                className="text-[1.75rem] sm:text-4xl md:text-5xl leading-[1.08] tracking-tight"
                style={{ fontFamily: "'Newsreader', serif", color: '#dfe2f1', fontWeight: 400 }}
              >
                {collection.title}{' '}
                <span
                  className="italic font-normal"
                  style={{
                    background: 'linear-gradient(90deg, #ffc174, #f59e0b, #ffb783)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontFamily: "'Newsreader', serif"
                  }}
                >
                  — рейтинг книг 2026
                </span>
              </h1>
            </div>

            {/* AI Assistant CTA */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 self-start lg:self-end mt-4 lg:mt-0">
              <button
                type="button"
                onClick={handleAiOpen}
                className="relative group overflow-hidden inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full text-sm font-semibold transition-all duration-300 active:scale-95"
                style={{
                  background: 'linear-gradient(90deg, #f59e0b, #d97722, #ff9837)',
                  color: '#0b0f19',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 0 28px rgba(245, 158, 11, 0.45)'
                }}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ color: '#0b0f19' }}>auto_awesome</span>
                <span>Спросить у Букстража</span>
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px]"
                  style={{ background: 'rgba(10, 14, 24, 0.3)', color: '#0b0f19' }}
                >
                  AI
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Stats bar */}
        {collection.type === "curated" && (
          <div className="collection-stats-bar mb-6">
            <span className="flex items-center gap-1">
              <BookOpen size={14} />
              {stats.totalBooks} книг в подборке
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              Сентябрь 2026
            </span>
          </div>
        )}

        {/* Bento Grid: Notes + Interactive Shelf (side by side on desktop) */}
        <div className="collection-bento-grid">
          <NotesBlock
            excerpt={collection.excerpt}
            editorialNote={collection.editorialNote}
          />

          {collection.type === "curated" && (
            <InteractiveShelfBlock
              books={collection.books as Record<string, import("@/types").Book>}
              shelfFilter={shelfFilter}
              onShelfFilterChange={setShelfFilter}
            />
          )}
        </div>

        {/* Value callout */}
        {collection.type === "curated" && markedCount === 0 && (
          <div className="brutal-card brutal-border p-5 mb-8 border-l-4" style={{ borderLeftColor: "var(--accent-main)" }}>
            <p className="text-sm text-(--ink-1) leading-relaxed">
              <span className="font-bold">Отмечайте книги, которые читали</span> —{' '}
              нажмите на книгу и отметьте её как прочитанную.{' '}
              Потом сможете собрать свой рейтинг из отмеченных книг.
            </p>
          </div>
        )}

        {/* Tier list */}
        {collection.type === "curated" && collection.tiers && collection.tierOrder && collection.books && (
          <div className="mb-8">
            <StaticTierView
              tiers={collection.tiers as Record<string, import("@/types").Tier>}
              tierOrder={collection.tierOrder}
              books={filteredBooks as Record<string, import("@/types").Book>}
              onViewBook={handleViewBook}
              statuses={shelf}
              unrankedBookIds={collection.unrankedBookIds}
              linkToBook
            />
          </div>
        )}

        {/* CTA */}
        <div className="overflow-hidden transition-all duration-500 ease-in-out" style={{ maxHeight: collection.type === "curated" && markedCount > 0 ? "500px" : "0px" }}>
          <div
            className="overflow-hidden transition-all duration-500 ease-in-out"
            style={{ maxHeight: collection.type === "curated" && markedCount > 0 ? "500px" : "0px", opacity: collection.type === "curated" && markedCount > 0 ? 1 : 0 }}
          >
            <div className="brutal-card brutal-border p-6 mb-8 text-center">
              {markedCount >= 4 ? (
                <>
                  <p className="text-lg font-bold mb-2">
                    Не согласны с этим рейтингом?
                  </p>
                  <p className="text-sm text-(--ink-2) mb-4">
                    Вы добавили {markedCount} из {stats.totalBooks} книг этой подборки в свой план —{' '}
                    соберите свой рейтинг из того, что планируете прочитать.
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
          context={{ pageType: "collection", slug: collection.slug }}
        />

        {/* Похожие подборки */}
        {relatedCollections.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
              <div>
                <h2 className="community-heading text-xl font-black leading-tight sm:text-2xl">
                  Похожие подборки
                </h2>
                <p className="text-(--ink-1) mt-1 text-sm">
                  Ещё подборки книг, которые могут вам понравиться
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              {relatedCollections.map((related) => (
                <CollectionCard key={related.id} collection={related} />
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
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
      </div>
    </>
  );
}

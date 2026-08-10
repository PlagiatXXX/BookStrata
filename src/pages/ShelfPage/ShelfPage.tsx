import { useState, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BookMarked, Check, Heart, ListPlus, LogIn } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { sileo } from "sileo";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { SEOHead } from "@/components/SEO/SEOHead";
import { BookViewModal } from "@/components/BookViewModal/BookViewModal";
import { Spinner } from "@/components/Spinner";
import { ConfirmModal } from "@/ui/ConfirmModal";
import { BookCover } from "@/ui/BookCover";
import { useBookshelf } from "@/hooks/useBookshelf";
import { useAuth } from "@/hooks/useAuthContext";
import { fetchShelfBooks } from "@/lib/shelfApi";
import type { Book } from "@/types";
import { CreateTierListModal } from "./components/CreateTierListModal";
import "./ShelfPage.css";

/** Из снимка книги (таблица Book) в карточку BookCover */
function toBook(b: { title: string; author: string | null; coverImageUrl: string; genre: string | null; description: string | null }): Book {
  return {
    id: "",
    title: b.title,
    author: b.author ?? "",
    coverImageUrl: b.coverImageUrl,
    genre: b.genre ?? "",
    description: b.description ?? "",
  } as Book;
}

/** Источник для создания тир-листа */
interface TierListSource {
  books: Book[];
  defaultTitle: string;
}

export default function ShelfPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {
    shelf,
    guestBookMeta,
    totalCount,
    readCount,
    wantToReadCount,
    clearShelf,
  } = useBookshelf();
  const [viewedBook, setViewedBook] = useState<Book | null>(null);
  const [isClearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [tierListSource, setTierListSource] = useState<TierListSource | null>(
    null,
  );

  // Полка с данными книг — только для авторизованного
  const { data: entries, isLoading } = useQuery({
    queryKey: ["shelf", "books"],
    queryFn: fetchShelfBooks,
    enabled: isAuthenticated,
  });

  // Книги секций: авторизованный — с сервера, гость — из localStorage meta
  const sections = useMemo(() => {
    const read: Book[] = [];
    const wantToRead: Book[] = [];
    if (isAuthenticated) {
      for (const entry of entries ?? []) {
        const book = toBook(entry.book);
        book.id = String(entry.bookId);
        if (entry.status === "read") read.push(book);
        else wantToRead.push(book);
      }
    } else {
      for (const [bookKey, status] of Object.entries(shelf)) {
        const meta = guestBookMeta[bookKey];
        if (!meta?.title) continue; // без данных книги карточку не собрать
        const book: Book = {
          id: bookKey,
          title: meta.title,
          author: meta.author ?? "",
          coverImageUrl: meta.coverImageUrl ?? "",
          genre: meta.genre ?? "",
          description: meta.description ?? "",
        };
        if (status === "read") read.push(book);
        else wantToRead.push(book);
      }
    }
    return { read, wantToRead };
  }, [entries, isAuthenticated, shelf, guestBookMeta]);

  // Все книги полки — для общего тир-листа
  const allBooks = useMemo(
    () => [...sections.read, ...sections.wantToRead],
    [sections],
  );

  const handleViewBook = useCallback((book: Book) => {
    setViewedBook(book);
  }, []);

  const handleCreateTierList = useCallback(
    (books: Book[], defaultTitle: string) => {
      if (books.length === 0) return;
      if (!isAuthenticated) {
        sileo.action({
          title: "Требуется регистрация",
          description:
            "Зарегистрируйтесь, чтобы создать тир-лист из книг полки",
          duration: 10000,
          button: {
            title: "Создать аккаунт",
            onClick: () => navigate("/auth?mode=register&redirect=/shelf"),
          },
        });
        return;
      }
      setTierListSource({ books, defaultTitle });
    },
    [isAuthenticated, navigate],
  );

  const handleClear = useCallback(() => {
    setClearConfirmOpen(false);
    clearShelf();
  }, [clearShelf]);

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    count: number,
    items: Book[],
    emptyText: string,
    chipWarm: boolean,
    actionLabel?: string,
    defaultTitle?: string,
  ) => (
    <section className="mb-10">
      <div className="clay-section">
        {icon}
        <h2 className="text-sm font-black uppercase tracking-wide text-(--theme-text)">
          {title}
        </h2>
        <span className={`clay-chip ${chipWarm ? "clay-chip-warm" : ""}`}>
          {count}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-(--theme-text-muted) py-6">{emptyText}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            {items.map((book) => (
              <BookCover
                key={book.id}
                book={book}
                isDraggable={false}
                onView={handleViewBook}
                priority={false}
              />
            ))}
          </div>
          {actionLabel && defaultTitle && (
            <button
              onClick={() => handleCreateTierList(items, defaultTitle)}
              className="clay-btn clay-btn-soft clay-btn-sm mt-4"
            >
              <ListPlus size={13} />
              {actionLabel}
            </button>
          )}
        </>
      )}
    </section>
  );

  return (
    <>
      <SEOHead
        title="Полка — прочитанное и «хочу прочитать»"
        description="Ваша полка: книги, которые вы отметили как прочитанные или хотите прочитать. Соберите из них свой рейтинг."
        url="https://bookstrata.ru/shelf"
        noindex
      />
      <DashboardLayout showSearch={false} bgVariant="clay">
        <div className="clay-shelf max-w-6xl mx-auto px-4 sm:px-6 pb-12">
          <header className="mb-8 pt-2">
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:gap-6">
              <div className="min-w-0 flex-1 text-center md:text-left">
                <h1 className="text-xl font-black leading-tight sm:text-2xl text-(--theme-text)">
                  Полка
                </h1>
                <p className="text-xs text-(--theme-text-muted) mt-1">
                  {totalCount === 0
                    ? "Отмечайте книги, чтобы собрать их здесь"
                    : `${readCount} прочитано · ${wantToReadCount} в планах`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {allBooks.length > 0 && (
                  <button
                    onClick={() =>
                      handleCreateTierList(allBooks, "Вся моя полка")
                    }
                    className="clay-btn clay-btn-primary clay-btn-sm"
                  >
                    <BookMarked size={14} />
                    Создать тир-лист из всей полки
                  </button>
                )}
                {allBooks.length > 0 && (
                  <button
                    onClick={() => setClearConfirmOpen(true)}
                    className="clay-btn clay-btn-soft clay-btn-sm"
                  >
                    Очистить полку
                  </button>
                )}
              </div>
            </div>
          </header>

          {!isAuthenticated && (
            <div className="clay-card p-4 mb-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-bold text-sm mb-0.5 text-(--theme-text)">
                    Полка хранится локально на этом устройстве
                  </p>
                  <p className="text-xs text-(--theme-text-muted)">
                    Войдите в аккаунт, чтобы полка была доступна на всех
                    устройствах и не потерялась при очистке браузера.
                  </p>
                </div>
                <Link to="/auth?mode=login&redirect=/shelf" className="clay-btn clay-btn-primary clay-btn-sm shrink-0">
                  <LogIn size={14} />
                  Войти
                </Link>
              </div>
            </div>
          )}

          {isAuthenticated && isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              {/* Баннер — когда полка пустая */}
              {totalCount === 0 && (
                <div className="clay-card p-8 mb-8 text-center">
                  <p className="text-xl font-black mb-2 text-(--theme-text)">
                    Полка пока пуста
                  </p>
                  <p className="text-sm text-(--theme-text-muted) mb-6 max-w-md mx-auto">
                    Загляните в коллекции и тир-листы, открывайте книги и
                    отмечайте их: «Прочитал» или «Хочу прочитать».
                  </p>
                  <button
                    onClick={() => navigate("/rankings")}
                    className="clay-btn clay-btn-primary"
                  >
                    Найти книги
                  </button>
                </div>
              )}

              {totalCount > 0 && (
                <div className="space-y-10">
                  {renderSection(
                    "Прочитал",
                    <Check size={18} className="text-(--theme-success)" />,
                    readCount,
                    sections.read,
                    "Здесь появятся книги, которые вы отметили как прочитанные.",
                    false,
                    "Создать тир-лист из прочитанных",
                    "Моё прочитанное",
                  )}
                  {renderSection(
                    "Хочу прочитать",
                    <Heart size={18} className="text-(--theme-accent-secondary)" />,
                    wantToReadCount,
                    sections.wantToRead,
                    "Здесь появятся книги, которые вы отметили «Хочу прочитать».",
                    true,
                    "Создать тир-лист из «хочу прочитать»",
                    "Хочу прочитать",
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>

      <BookViewModal
        book={viewedBook}
        isOpen={viewedBook !== null}
        onClose={() => setViewedBook(null)}
        isReadOnly
        hideThoughts
      />

      <ConfirmModal
        isOpen={isClearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        onConfirm={handleClear}
        title="Очистить полку?"
        description="Отметки будут сняты со всех книг. Это действие нельзя отменить."
        confirmText="Очистить"
        cancelText="Отмена"
      />

      {tierListSource && (
        <CreateTierListModal
          isOpen={tierListSource !== null}
          onClose={() => setTierListSource(null)}
          books={tierListSource.books}
          defaultTitle={tierListSource.defaultTitle}
        />
      )}
    </>
  );
}
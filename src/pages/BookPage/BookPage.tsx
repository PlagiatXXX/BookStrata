// src/pages/BookPage/BookPage.tsx
// Страница книги /books/:slug — «Nocturne Editorial» лонгрид
// (референс: reference/master.md + reference/code.html, решение 13.08).
// Hero с 3D-обложкой, fade-out описанием, «В тир-лист» + «Лайк»,
// рейтинг (0–10 → звёзды rating/2), «Где читать», «Погружение в контекст»,
// «Другие книги автора», «Похожие», «В тир-листах», «В подборках»,
// «У знаменитостей», «Обсуждение».
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { SEOHead } from "@/components/SEO/SEOHead";
import { Breadcrumbs } from "@/components/SEO/Breadcrumbs";
import { Header } from "@/ui/Header";
import { Footer } from "@/ui/Footer";
import { MobileBottomNav } from "@/ui/MobileBottomNav";
import { Spinner } from "@/components/Spinner";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";
import { useAuth } from "@/hooks/useAuthContext";
import { useAddBookToTierList, useBook, useMyTierLists } from "@/hooks/useBook";
import { useBookshelf } from "@/hooks/useBookshelf";
import { createTierList } from "@/lib/tierListApi";
import { BookCover3D } from "./BookCover3D";
import { BookRatingPanel } from "./BookRatingPanel";
import { BookContextChain } from "./BookContextChain";
// import { ContentLock } from "./ContentLock"; // отключено для открытого доступа к страницам книг
import { buildBookJsonLd, buildDescriptionSnippet } from "./seo";
import { BookComments } from "./BookComments";
import { BookSignUpCta } from "./BookSignUpCta";
import "./BookPage.css";

const SITE_URL = import.meta.env.VITE_SITE_URL || "https://bookstrata.ru";

export default function BookPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  // Единый каталог (19.08): переход с тир-листа (?from=) — в крошках
  // показываем путь «Тир-лист → Книга» вместо звена по жанру
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useBook(slug);
  const addToTierList = useAddBookToTierList(slug);
  const { shelf, toggleStatus } = useBookshelf();

  const [descExpanded, setDescExpanded] = useState(false);
  const [tierDropdownOpen, setTierDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Создание нового тир-листа прямо из выпадашки «В тир-лист»
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [createListError, setCreateListError] = useState<string | null>(null);

  // Список листов пользователя для кнопки «В тир-лист» (грузится при открытии)
  const myTierListsQuery = useMyTierLists(tierDropdownOpen && Boolean(user));
  const myTierLists = myTierListsQuery.data ?? null;

  // Закрытие выпадашки по клику вне
  useEffect(() => {
    if (!tierDropdownOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setTierDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [tierDropdownOpen]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#101418]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#101418] text-white">
        <p className="text-white/70">Не удалось загрузить страницу книги</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="bg-(--bp-primary) text-(--bp-on-primary) px-5 py-2.5 rounded-lg"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  // draft / не существует → 404
  if (!data) {
    return <NotFoundPage />;
  }

  const { book, tierLists, collections, celebrities, similarBooks, otherBooksByAuthor, comments } = data;
  const rating = book.rating;
  const contextChain = book.contextChain ?? [];
  const hasTags = book.tags.length > 0;

  // Единый каталог (19.08): переход с тир-листа (?from=) — в крошках
  // показываем путь «Тир-лист → Книга» вместо звена по жанру
  const fromTierListId = searchParams.get("from");
  const fromTierList = fromTierListId
    ? tierLists.find((t) => t.id === fromTierListId || t.slug === fromTierListId)
    : undefined;

  const breadcrumbs = [
    { name: "Главная", url: "/" },
    ...(fromTierList
      ? [{ name: fromTierList.title, url: `/tier-lists/${fromTierList.id}` }]
      : [{ name: book.genre ?? "Книги", url: "/rankings" }]),
    { name: book.title, url: `/books/${slug}` },
  ];

  const bookJsonLd = buildBookJsonLd({
    ...book,
    url: `${SITE_URL}/books/${slug}`,
  });

  // Статус книги в «Моей полке» (want_to_read / read / null)
  const isWantToRead = Boolean(book && shelf[book.id] === "want_to_read");

  const handleWantToRead = () => {
    // Полка доступна и гостям: локальная полка импортируется в аккаунт при входе
    toggleStatus(String(book.id), "want_to_read", {
      title: book.title,
      author: book.author ?? undefined,
      coverImageUrl: book.coverImageUrl || undefined,
      genre: book.genre ?? undefined,
      description: book.description ?? undefined,
    });
  };

  const handleAddToTierList = (tierListId: string) => {
    setTierDropdownOpen(false);
    addToTierList.mutate(tierListId);
  };

  const handleCreateAndAdd = async () => {
    const title = newListTitle.trim();
    if (!title || creatingList) return;
    setCreatingList(true);
    setCreateListError(null);
    try {
      const created = await createTierList(title);
      setTierDropdownOpen(false);
      setShowCreateForm(false);
      setNewListTitle("");
      // Новый лист должен появиться в списке при следующем открытии
      void queryClient.invalidateQueries({ queryKey: ["myTierLists"] });
      addToTierList.mutate(created.id);
    } catch (error) {
      setCreateListError(
        error instanceof Error ? error.message : "Не удалось создать тир-лист",
      );
    } finally {
      setCreatingList(false);
    }
  };

  return (
    <div className="book-page">
      <SEOHead
        title={`${book.title}${book.author ? ` — ${book.author}` : ""}: описание и рейтинг`}
        description={buildDescriptionSnippet(book)}
        image={book.coverImageUrl}
        url={`/books/${slug}`}
        type="article"
        hideSiteName
        breadcrumbs={breadcrumbs.map((b) => ({ name: b.name, url: b.url }))}
      />
      {/* JSON-LD Book (через Helmet — отдельно от SEOHead) */}
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(bookJsonLd)}</script>
      </Helmet>

      <Header showSearch={false} />

      <main className="relative">
        {/* ── HERO ── */}
        <header className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center gap-8 md:gap-12 pt-24 pb-16 overflow-x-clip">
          {/* Cinematic backdrop: размытая обложка + градиент */}
          {book.coverImageUrl && (
            <div aria-hidden className="absolute inset-0">
              <div
                className="absolute inset-0 bg-cover bg-center w-full h-full filter blur-xl opacity-40 scale-110"
                style={{ backgroundImage: `url(${book.coverImageUrl})` }}
              />
              <div className="absolute inset-0 bg-linear-to-b from-(--bp-background)/30 via-(--bp-background)/80 to-(--bp-background)" />
            </div>
          )}

          <div className="relative z-30 w-full max-w-275 mx-auto px-4 md:px-5">
            {/* Кнопка «Назад» + хлебные крошки */}
            <div className="flex items-center justify-between mb-8">
              <button
                type="button"
                onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}
                className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
              >
                <span className="ms-icon text-lg">arrow_back</span>
                Назад
              </button>
              <div className="hidden md:block">
                <Breadcrumbs items={breadcrumbs.map((b) => ({ label: b.name, href: b.url }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Левая колонка: 3D-обложка */}
            <div className="md:col-span-4 flex justify-center md:justify-end">
              <BookCover3D coverImageUrl={book.coverImageUrl} title={book.title} />
            </div>

            {/* Центр: метаданные + описание + действия */}
            <div className="md:col-span-5 flex flex-col justify-center relative z-20 md:pl-8">
              <div className="flex flex-wrap items-center gap-4 mb-2">
                {book.genre && (
                  <span className="bp-label-caps text-(--bp-primary) tracking-widest">
                    {book.genre}
                  </span>
                )}
                {book.publishedYear && (
                  <span className="bp-label-caps text-(--bp-on-surface-variant) tracking-widest">
                    {book.publishedYear} г.
                  </span>
                )}
                {hasTags && (
                  <>
                    <div className="h-3 w-px bg-white/10" />
                    <div className="flex flex-wrap gap-4">
                      {book.tags.slice(0, 5).map((tag) => (
                        <span key={tag} className="bp-label-caps bp-tag-caps text-(--bp-on-surface-variant) tracking-widest">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <h1 className="bp-display text-[32px] md:text-5xl text-white drop-shadow-2xl mb-1 leading-[1.15]">
                {book.title}
              </h1>
              {book.author && (
                <h2 className="text-lg text-(--bp-primary)/90 drop-shadow-md mb-3">
                  {book.author}
                </h2>
              )}

{/* Описание с fade-out — видно всем */}
              {book.description && (
                <div className="bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-2xl mb-8">
                  <div className="relative">
                    <p
                      className={`text-[15px] leading-relaxed text-white/90 max-w-prose overflow-hidden transition-all duration-500 ease-in-out ${
                        descExpanded ? "line-clamp-none" : "line-clamp-4"
                      }`}
                    >
                      {book.description}
                      <span
                        aria-hidden
                        className={`absolute bottom-0 left-0 w-full h-12 bg-linear-to-t from-black/80 to-transparent pointer-events-none transition-opacity duration-500 ${
                          descExpanded ? "opacity-0" : "opacity-100"
                        }`}
                      />
                    </p>
                    <button
                      type="button"
                      onClick={() => setDescExpanded((v) => !v)}
                      className="mt-4 flex items-center gap-2 text-(--bp-primary) hover:text-white transition-colors bp-label-caps tracking-widest"
                    >
                      <span className="ms-icon text-sm">
                        {descExpanded ? "expand_less" : "expand_more"}
                      </span>
                      {descExpanded ? "Свернуть" : "Читать полностью"}
                    </button>
                  </div>
                </div>
              )}

              {/* Действия. relative — якорь для выпадашки тир-листов: на мобильных
                  панель растёт от левого края контейнера и не обрезается экраном.
                  gap-2/px-3 — компактные отступы, чтобы обе кнопки влезали в ряд на 360px. */}
              <div ref={dropdownRef} className="relative flex flex-wrap gap-2 sm:gap-4">
                <button
                  type="button"
                  onClick={handleWantToRead}
                  className="h-12 whitespace-nowrap bg-black/40 backdrop-blur-md border border-white/20 hover:border-white/50 text-white bp-label-caps bp-label-caps-compact px-3 sm:px-4 rounded-lg transition-all flex items-center gap-2 shadow-lg hover:bg-white/5"
                >
                  <span
                    className="ms-icon text-sm text-(--bp-primary)"
                    style={{ fontVariationSettings: isWantToRead ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    bookmarks
                  </span>
                  {isWantToRead ? "Уже в плане" : "Хочу прочитать"}
                </button>

                {/* «В тир-лист» — выпадающий список листов */}
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      navigate(`/auth?mode=register&redirect=${encodeURIComponent(`/books/${slug}`)}`);
                      return;
                    }
                    setTierDropdownOpen((v) => !v);
                  }}
                  className="h-12 whitespace-nowrap bg-(--bp-primary) hover:bg-(--bp-primary-container) text-(--bp-on-primary) bp-label-caps bp-label-caps-compact px-3 sm:px-6 rounded-lg shadow-[0_0_20px_rgba(255,183,135,0.3)] hover:shadow-[0_0_30px_rgba(255,183,135,0.5)] transition-all flex items-center gap-2"
                >
                  <span className="ms-icon text-sm">format_list_bulleted</span>
                  В тир-лист
                  <span className="ms-icon text-sm" style={{ transform: tierDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                    expand_more
                  </span>
                </button>

                {tierDropdownOpen && (
                  <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-primary/30 bg-(--bp-surface-container-high) backdrop-blur-xl shadow-2xl z-60 py-2">
                      <p className="bp-label-caps text-white/50 px-4 py-2 tracking-widest">
                        Добавить в тир-лист
                      </p>
                      {myTierListsQuery.isLoading && (
                        <p className="px-4 py-3 text-sm text-white/60">Загрузка...</p>
                      )}
                      {!myTierListsQuery.isLoading && myTierLists?.length === 0 && (
                        <p className="px-4 py-3 text-sm text-white/60">
                          Нет тир-листов. Создайте первый ниже.
                        </p>
                      )}
                      {!myTierListsQuery.isLoading &&
                        myTierLists?.map((tl) => (
                          <button
                            key={tl.id}
                            type="button"
                            onClick={() => handleAddToTierList(tl.id)}
                            className="w-full text-left px-4 py-2.5 text-sm text-white/85 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                          >
                            <span className="ms-icon text-base text-(--bp-primary)">list_alt</span>
                            {tl.title}
                          </button>
                        ))}

                      {/* Создание нового тир-листа прямо из выпадашки */}
                      <div className="border-t border-white/10 mt-1">
                        {!showCreateForm ? (
                          <button
                            type="button"
                            onClick={() => setShowCreateForm(true)}
                            className="w-full text-left px-4 py-2.5 text-sm text-(--bp-primary) hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                          >
                            <span className="ms-icon text-base">add</span>
                            Новый тир-лист
                          </button>
                        ) : (
                          <div className="px-3 py-2 space-y-2">
                            <input
                              autoFocus
                              value={newListTitle}
                              onChange={(e) => setNewListTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") void handleCreateAndAdd();
                                if (e.key === "Escape") {
                                  setShowCreateForm(false);
                                  setNewListTitle("");
                                  setCreateListError(null);
                                }
                              }}
                              placeholder="Название тир-листа"
                              className="w-full px-3 py-2 text-sm bg-black/30 border border-white/15 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-(--bp-primary)"
                            />
                            {createListError && (
                              <p className="text-xs text-red-400">{createListError}</p>
                            )}
                            <button
                              type="button"
                              disabled={!newListTitle.trim() || creatingList}
                              onClick={() => void handleCreateAndAdd()}
                              className="w-full px-3 py-2 text-sm rounded-lg bg-(--bp-primary) text-(--bp-on-primary) hover:bg-(--bp-primary-container) disabled:opacity-50 transition-colors"
                            >
                              {creatingList ? "Создание..." : "Создать и добавить"}
                            </button>
                          </div>
                        )}
                       </div>
                     </div>
                   )}
               </div>

               {/* Scroll indicator: «Листай дальше» — сразу под кнопками действий */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-12 flex flex-col items-center gap-1 text-white/30 select-none"
              >
                <span className="text-xs">Листай дальше</span>
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="ms-icon text-base">expand_more</span>
                </motion.div>
              </motion.div>
            </div>

            {/* Сайдбар: рейтинг + «Где читать» */}
            <div className="md:col-span-3 pt-8 md:pt-0 md:pl-4 flex flex-col justify-center relative z-10">
              <div className="bg-black/30 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-2xl h-full">
                {rating !== null && rating !== undefined && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="bp-label-caps text-white/80 tracking-widest">Рейтинг</h3>
                      <span className="text-4xl font-bold text-(--bp-primary) drop-shadow-md">
                        {rating.toFixed(1)}
                      </span>
                    </div>
                    <RatingStars rating={rating} />
                  </div>
                )}

                {/* Оценить книгу: слайдер 0–10, одна оценка на пользователя */}
                <BookRatingPanel bookId={book.id} defaultRating={rating} />

                {/* «Где читать» — две кнопки-пустышки (без рекламы; affiliate — этап 3 Roadmap) */}
                <div>
                  <h3 className="bp-label-caps text-white/80 tracking-widest mb-4">Где читать</h3>
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      className="bp-glass-panel p-3 rounded-lg flex items-center gap-4 hover:bg-white/10 border border-white/10 transition-all hover:shadow-lg"
                    >
                      <div className="w-10 h-10 bg-black/40 rounded-md flex items-center justify-center border border-white/5">
                        <span className="ms-icon text-white text-base">book</span>
                      </div>
                      <span className="text-[15px] text-white font-medium">BookStrata</span>
                    </button>
                    <button
                      type="button"
                      className="bp-glass-panel p-3 rounded-lg flex items-center gap-4 hover:bg-white/10 border border-white/10 transition-all hover:shadow-lg"
                    >
                      <div className="w-10 h-10 bg-black/40 rounded-md flex items-center justify-center border border-white/5">
                        <span className="ms-icon text-white text-base">headphones</span>
                      </div>
                      <span className="text-[15px] text-white font-medium">BookStrata</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </header>

        {/* ── Нижний контент: гость видит вместо него замок с CTA ── */}
        {/* ContentLock отключён для открытого доступа к страницам книг */}
        {/* <ContentLock
          description="Зарегистрируйтесь, чтобы посмотреть лонгрид и увидеть отзывы"
          redirectTo={`/books/${slug}`}
        > */}
          {/* ── Погружение в контекст ── */}
          {contextChain.length > 0 && <BookContextChain items={contextChain} />}

          {/* ── Другие книги автора ── */}
          {otherBooksByAuthor.length > 0 && (
            <section className="relative py-12">
              <div className="max-w-275 mx-auto px-4 md:px-5">
                <h2 className="bp-display text-white text-xl md:text-2xl mb-6">Другие книги автора</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {otherBooksByAuthor.map((b) => (
                    <BookCardLink key={b.id} book={b} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── Похожие книги ── */}
          {similarBooks.length > 0 && (
            <section className="relative py-12 border-t border-primary/20">
              <div className="max-w-275 mx-auto px-4 md:px-5">
                <h2 className="bp-display text-white text-xl md:text-2xl mb-6">Похожие книги</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {similarBooks.slice(0, 4).map((b) => (
                    <BookCardLink key={b.id} book={b} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── Встречается в тир-листах ── */}
          {tierLists.length > 0 && (
            <section className="relative pt-4 pb-12 border-t border-primary/20">
              <div className="max-w-275 mx-auto px-4 md:px-5">
                <h2 className="bp-display text-white text-xl md:text-2xl mb-6">Встречается в тир-листах</h2>
                <div className="flex flex-wrap gap-3">
{tierLists.map((tl) => (
                    <Link
                      key={tl.id}
                      to={`/tier-lists/${tl.slug || tl.id}`}
                      className="bp-glass-panel px-4 py-2.5 rounded-lg border border-white/10 hover:border-primary/50 text-white/80 hover:text-white text-sm transition-colors"
                    >
                      {tl.title}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── В подборках ── */}
          {collections.length > 0 && (
            <section className="relative pt-4 pb-12 border-t border-primary/20">
              <div className="max-w-275 mx-auto px-4 md:px-5">
                <h2 className="bp-display text-white text-xl md:text-2xl mb-6">В подборках</h2>
                <div className="flex flex-wrap gap-3">
                  {collections.map((c) => (
                    <Link
                      key={c.id}
                      to={`/collections/${c.slug}`}
                      className="bp-glass-panel px-4 py-2.5 rounded-lg border border-white/10 hover:border-primary/50 text-white/80 hover:text-white text-sm transition-colors"
                    >
                      {c.title}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── У знаменитостей ── */}
          {celebrities.length > 0 && (
            <section className="relative py-12 border-t border-primary/20">
              <div className="max-w-275 mx-auto px-4 md:px-5">
                <h2 className="bp-display text-white text-xl md:text-2xl mb-6">У знаменитостей</h2>
                <div className="flex flex-wrap gap-3">
                  {celebrities.map((c) => (
                    <Link
                      key={c.id}
                      to={`/celebrities/${c.slug}`}
                      className="bp-glass-panel px-4 py-2.5 rounded-lg border border-white/10 hover:border-primary/50 text-white/80 hover:text-white text-sm transition-colors"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── Обсуждение ── */}
          <BookComments slug={slug!} initialItems={comments.items} initialTotal={comments.total} />

          {/* ── Призыв к регистрации для гостей ── */}
          <BookSignUpCta redirectTo={`/books/${slug}`} />
        {/* </ContentLock> */}
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

/** Звёзды рейтинга: Book.rating (0–10) → 5 звёзд (rating/2). Десятые — видимой
 *  заливкой по глифу последней частичной звезды (background-clip: text). */
function RatingStars({ rating }: { rating: number }) {
  const stars = Math.min(Math.max(rating / 2, 0), 5);
  const full = Math.floor(stars);
  const fraction = stars - full; // доля следующей звезды 0..1

  return (
    <div className="relative inline-block" aria-label={`Рейтинг ${rating.toFixed(1)} из 10`}>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => {
          if (i < full) return <StarGlyph key={i} variant="full" />;
          if (i === full && fraction > 0.01) {
            return <StarGlyph key={i} variant="partial" fraction={fraction} />;
          }
          return <StarGlyph key={i} variant="empty" />;
        })}
      </div>
    </div>
  );
}

/** Одна звезда: полная / пустая / частичная (заливка ровно по глифу). */
function StarGlyph({
  variant,
  fraction,
}: {
  variant: "full" | "empty" | "partial";
  fraction?: number;
}) {
  if (variant === "full") {
    return (
      <span
        className="ms-icon text-xl shrink-0 text-(--bp-primary) drop-shadow-[0_0_8px_rgba(255,183,135,0.5)]"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        star
      </span>
    );
  }
  if (variant === "empty") {
    return <span className="ms-icon text-xl shrink-0 text-white/30">star</span>;
  }
  // Частичная: внизу пустой контур, сверху — градиентная заливка по глифу
  const pct = Math.round((fraction ?? 0) * 100 * 10) / 10;
  return (
    <span className="ms-icon text-xl shrink-0 relative inline-block">
      <span
        className="ms-icon absolute inset-0 text-white/30"
        aria-hidden
        style={{ fontVariationSettings: "'FILL' 0" }}
      >
        star
      </span>
      <span
        className="ms-icon relative"
        aria-hidden
        style={{
          fontVariationSettings: "'FILL' 1",
          backgroundImage: `linear-gradient(to right, var(--bp-primary) ${pct}%, transparent ${pct}%)`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        star
      </span>
    </span>
  );
}

/** Карточка книги-ссылки (другие книги автора / похожие). */
function BookCardLink({ book }: { book: { slug: string | null; title: string; coverImageUrl: string } }) {
  if (!book.slug) return null;
  return (
    <Link
      to={`/books/${book.slug}`}
      className="group block hover:-translate-y-3 hover:scale-[1.02] transition-all duration-500 ease-out"
    >
      <div className="aspect-2/3 rounded-lg overflow-hidden mb-3 border border-white/10 shadow-lg bp-book-hover-lift">
        {book.coverImageUrl ? (
          <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-(--bp-surface-container-high) flex items-center justify-center">
            <span className="text-white/50 text-sm text-center px-4">{book.title}</span>
          </div>
        )}
      </div>
      <h3 className="text-white/90 group-hover:text-(--bp-primary) transition-colors line-clamp-1 text-sm font-semibold">
        {book.title}
      </h3>
    </Link>
  );
}
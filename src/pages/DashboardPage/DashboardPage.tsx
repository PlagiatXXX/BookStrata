import { useEffect, useCallback, memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { useAuth } from "@/hooks/useAuthContext";
import { apiGetUserStats, apiGetMyTierLists, apiGetMyBooks, type MyBook } from "@/lib/userApi";
import { DashboardHeader } from "./components/DashboardHeader";
import { UserActivityStats } from "@/components/DashboardHeroSection/components/UserActivityStats";
import { DashboardAchievements } from "@/components/DashboardHeroSection/components/DashboardAchievements";
import { TrendingNow } from "@/components/DashboardHeroSection/components/TrendingNow";
import { TierListGrid } from "./components/TierListGrid";
import { BookCard } from "./components/BookCard";
import { BookViewModal } from "@/components/BookViewModal/BookViewModal";
import { SkeletonGrid, SkeletonCard } from "@/ui/Skeleton";

import "./DashboardPage.css";
import logger from "@/lib/logger";
import type { TierListShort } from "@/lib/tierListApi";


// Мемоизируем компоненты дашборда для предотвращения ререндеров
const MemoizedDashboardHeader = memo(DashboardHeader);
const MemoizedUserActivityStats = memo(UserActivityStats);


export default function DashboardPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const isGuest = !isAuthenticated;

  // Отслеживаем изменения пользователя (например, обновление аватара)
 useEffect(() => {
    if (user) {
      logger.info("Пользователь в панели", {
        username: user.username,
        hasAvatar: !!user.avatarUrl,
        avatarUrl: user.avatarUrl?.substring(0, 50) + "...",
      });
    }
  }, [user]);

  const [activeStat, setActiveStat] = useState<'tierlists' | 'published' | 'drafts' | 'books' | null>(null);
  const [viewingBook, setViewingBook] = useState<MyBook | null>(null);
  const [showBooks, setShowBooks] = useState(true);

  // Data fetching - User stats
  const { data: stats } = useQuery({
    queryKey: ["user", "stats"],
    queryFn: apiGetUserStats,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !isGuest,
  });

  // Data fetching - My tier lists
  const showTierLists = activeStat && activeStat !== 'books';
  const { data: myTierListsData, isLoading: isTierListsLoading } = useQuery({
    queryKey: ["user", "myTierLists"],
    queryFn: () => apiGetMyTierLists(1, 100),
    enabled: !!showTierLists && !isGuest,
    staleTime: 60 * 1000,
  });

  // Data fetching - My books
  const { data: myBooksData, isLoading: isBooksLoading } = useQuery({
    queryKey: ["user", "myBooks"],
    queryFn: apiGetMyBooks,
    enabled: activeStat === 'books' && !isGuest,
    staleTime: 60 * 1000,
  });

  // Фильтрация тир-листов по активной статистике
  const filteredTierLists: TierListShort[] = showTierLists
    ? (myTierListsData?.data || []).filter((tl) => {
        if (activeStat === 'tierlists') return true;
        if (activeStat === 'published') return tl.isPublic;
        if (activeStat === 'drafts') return !tl.isPublic;
        return true;
      })
    : [];

  // Вычисляем значения для статистики
  const tierListsCount = stats?.tierListsCount || 0;
  const publishedCount = stats?.publishedCount || 0;
  const draftsCount = Math.max(0, tierListsCount - publishedCount);
  const totalBooks = stats?.totalBooks || 0;
  const likesCount = stats?.likesCount || 0;
  const lastActivity = stats?.lastActivity || null;

  // Обработчики кликов по статистике (toggle)
  const handleTierListsClick = useCallback(() => {
    setActiveStat((prev) => prev === 'tierlists' ? null : 'tierlists');
  }, []);
  const handlePublishedClick = useCallback(() => {
    setActiveStat((prev) => prev === 'published' ? null : 'published');
  }, []);
  const handleDraftsClick = useCallback(() => {
    setActiveStat((prev) => prev === 'drafts' ? null : 'drafts');
  }, []);
  const handleBooksClick = useCallback(() => {
    setActiveStat((prev) => prev === 'books' ? null : 'books');
    setShowBooks(true);
  }, []);

  // Стабилизируем обработчики
  const handleLogout = useCallback(() => {
    logout();
    navigate("/", { replace: true });
  }, [logout, navigate]);

  const handleCreateTierList = useCallback(() => {
    navigate(isGuest ? "/auth?mode=register" : "/templates");
  }, [navigate, isGuest]);

  const handleCommunityClick = useCallback(() => navigate("/community"), [navigate]);

  const handleOpenTierList = useCallback((id: string) => {
    navigate(`/tier-lists/${id}`);
  }, [navigate]);

  const handleViewBook = useCallback((book: MyBook) => {
    setViewingBook(book);
  }, []);

  const handleCloseViewBook = useCallback(() => {
    setViewingBook(null);
  }, []);

  return (
    <DashboardLayout
      showSearch={false}
    >
      <section className="dashboard-home">
        <MemoizedDashboardHeader
          username={isGuest ? "Гость" : (user?.username || "")}
          onCreateClick={handleCreateTierList}
          onCommunityClick={handleCommunityClick}
          onLogoutClick={handleLogout}
        />

        <div className="dashboard-home__container">

          {isGuest ? (
            /* Гостевой блок: CTA */
            <div className="mx-auto my-8 max-w-3xl px-1 sm:px-0 text-center">
              <div className="border-2 border-black bg-gray-900 p-8 shadow-[4px_4px_0_0_#000000]">
                <h2 className="nb-display-lg text-white mb-4">
                  Хочешь создавать тир-листы?
                </h2>
                <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                  Зарегистрируйся, чтобы собирать визуальные рейтинги книг,
                  участвовать в баттлах и находить книги по вкусу с помощью ИИ.
                </p>
                <button
                  onClick={() => navigate("/auth?mode=register")}
                  className="inline-flex items-center gap-2 rounded-none border-2 border-black bg-[#c1fffe] px-8 py-3 font-bold text-black text-lg shadow-[4px_4px_0_0_#000000] hover:shadow-[6px_6px_0_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
                  type="button"
                >
                  Создать аккаунт
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Stats Section */}
              <MemoizedUserActivityStats
                tierListsCount={tierListsCount}
                publishedCount={publishedCount}
                draftsCount={draftsCount}
                totalBooks={totalBooks}
                likesCount={likesCount}
                lastActivity={lastActivity}
                onTierListsClick={handleTierListsClick}
                onPublishedClick={handlePublishedClick}
                onDraftsClick={handleDraftsClick}
                onBooksClick={handleBooksClick}
                activeStat={activeStat}
              />

              {/* Expandable section: tier lists grid */}
              {showTierLists && (
                <div className="mt-6 sm:mt-8 mb-8 sm:mb-10">
                  <div className="user-activity-stats__container">
                    <h3 className="text-base sm:text-lg font-bold text-white mb-4">
                      {activeStat === 'tierlists' && 'Все тир-листы'}
                      {activeStat === 'published' && 'Опубликованные тир-листы'}
                      {activeStat === 'drafts' && 'Черновики'}
                    </h3>
                    {isTierListsLoading ? (
                      <SkeletonGrid count={6} />
                    ) : filteredTierLists.length === 0 ? (
                      <p className="text-[#94a3b8] text-sm">Нет тир-листов</p>
                    ) : (
                      <TierListGrid
                        tierLists={filteredTierLists}
                        onOpen={handleOpenTierList}
                        onRename={() => {}}
                        onDelete={() => {}}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Expandable section: books list */}
              {activeStat === 'books' && (
                <div className="mt-6 sm:mt-8 mb-8 sm:mb-10">
                  <div className="user-activity-stats__container">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        Все книги в подборках
                        {myBooksData && (
                          <span className="text-sm font-normal text-[#94a3b8] ml-2">
                            ({myBooksData.length})
                          </span>
                        )}
                      </h3>
                      <button
                        onClick={() => setShowBooks((prev) => !prev)}
                        className="text-xs text-[#60a5fa] hover:text-[#93bbfd] transition-colors cursor-pointer"
                        type="button"
                      >
                        {showBooks ? 'Скрыть все' : 'Развернуть'}
                      </button>
                    </div>
                    {isBooksLoading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <SkeletonCard key={i} />
                        ))}
                      </div>
                    ) : myBooksData && myBooksData.length > 0 ? (
                      showBooks && (
                        <div className="dashboard-grid dashboard-grid--books">
                          {myBooksData.map((book) => (
                            <BookCard
                              key={book.id}
                              book={book}
                              onView={handleViewBook}
                            />
                          ))}
                        </div>
                      )
                    ) : (
                      <p className="text-[#94a3b8] text-sm">Книги не найдены</p>
                    )}
                  </div>
                </div>
              )}

              {/* Achievements & XP */}
              <DashboardAchievements />
            </>
          )}

          {/* Trending Now (public) */}
          <TrendingNow />
        </div>
      </section>

      <BookViewModal
        book={viewingBook}
        isOpen={!!viewingBook}
        onClose={handleCloseViewBook}
      />
    </DashboardLayout>
  );
}

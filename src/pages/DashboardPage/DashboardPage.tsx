import { useEffect, useCallback, memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { useAuth } from "@/hooks/useAuthContext";
import { getUserTierLists } from "@/lib/tierListApi";
import { apiGetUserStats } from "@/lib/userApi";
import { useDebounce } from "@/hooks/useDebounce";
import { sileo } from "sileo";
import type { SortOption } from "./types";
import { useDashboardState } from "./hooks/useDashboardState";
import { useTierListActions } from "./hooks/useTierListActions";
import { useTierListsPagination } from "./hooks/useTierListsPagination";
import { DashboardHeader } from "./components/DashboardHeader";
import { UserActivityStats } from "@/components/DashboardHeroSection/components/UserActivityStats";
import { RecentPublicTierLists } from "@/components/DashboardHeroSection/components/RecentPublicTierLists";
import { TrendingNow } from "@/components/DashboardHeroSection/components/TrendingNow";
import { DashboardAchievements } from "@/components/DashboardHeroSection/components/DashboardAchievements";
import { TierListGrid } from "./components/TierListGrid";
import { Pagination } from "@/ui/Pagination";
import { EmptyStates } from "./components/EmptyStates";
import { CreateTierListModal } from "./components/CreateTierListModal";
import { RenameTierListModal } from "./components/RenameTierListModal";
import { DeleteTierListModal } from "./components/DeleteTierListModal";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";
import "./DashboardPage.css";
import logger from "@/lib/logger";
import { AiLibrarianModal } from "@/components/AiLibrarian/AiLibrarianModal";
import { Sparkles, Crown } from "lucide-react";


// Мемоизируем компоненты дашборда для предотвращения ререндеров при поиске
const MemoizedDashboardHeader = memo(DashboardHeader);
const MemoizedUserActivityStats = memo(UserActivityStats);
const MemoizedRecentPublicTierLists = memo(RecentPublicTierLists);
const MemoizedEmptyStates = memo(EmptyStates);
const MemoizedPagination = memo(Pagination);


export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

  // State management через reducer
  const {
    state,
    setCurrentPage,
    setSearchQuery,
    openCreateModal,
    openRenameModal,
    openDeleteModal,
    closeModal,
    setRenameTitle,
    setCreateTitle,
    setSortOption,
    setFilterOption,
  } = useDashboardState();

  const {
    currentPage,
    searchQuery,
    activeModal,
    tierListToRename,
    tierListToDelete,
    renameTitle,
    createTitle,
    sortOption,
    filterOption,
  } = state;

  const [isAiLibrarianOpen, setAiLibrarianOpen] = useState(false);

  // Оптимизация: дебаунсим поисковый запрос для фильтрации списка
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  // Data fetching - Tier lists
  const {
    data: paginatedResponse = {
      data: [],
      meta: {
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 10,
        totalPages: 0,
        currentPage: 1,
      },
    },
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["userTierLists", currentPage],
    queryFn: () => getUserTierLists(currentPage, DEFAULT_PAGE_SIZE),
  });

  // Data fetching - User stats
  const { data: stats } = useQuery({
    queryKey: ["user", "stats"],
    queryFn: apiGetUserStats,
    staleTime: 5 * 60 * 1000, // 5 минут
    retry: 2,
  });

  // Вычисляем значения для статистики
  const tierListsCount = stats?.tierListsCount || 0;
  const publishedCount = stats?.publishedCount || 0;
  const draftsCount = Math.max(0, tierListsCount - publishedCount);
  const totalBooks = stats?.totalBooks || 0;
  const likesCount = stats?.likesCount || 0;
  const lastActivity = stats?.lastActivity || null;

  // CRUD операции
  const {
    createNewTierList,
    renameTierList,
    removeTierList,
    isCreating,
    isRenaming,
    isDeleting,
  } = useTierListActions({
    onSuccess: closeModal,
    onRefetch: refetch,
  });

  // Фильтрация и пагинация - используем дебаунснутый поиск
  const { displayedTierLists } = useTierListsPagination({
    allTierLists: paginatedResponse?.data ?? [],
    searchQuery: debouncedSearchQuery,
    sortOption,
    filterOption,
  });

  const pagination = paginatedResponse.meta;

  // Стабилизируем обработчики для предотвращения ререндеров мемоизированных компонентов
  const handleMyRatingsClick = useCallback(() => {
    setCurrentPage(1);
    setSearchQuery("");
  }, [setCurrentPage, setSearchQuery]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/auth", { replace: true });
  }, [logout, navigate]);

  const handleOpenTierList = useCallback(
    (id: string) => {
      navigate(`/tier-lists/${id}`);
    },
    [navigate],
  );

  const handleCreateTierList = useCallback((title: string) => {
    createNewTierList(title);
  }, [createNewTierList]);

  const handleRename = useCallback(() => {
    if (!tierListToRename) return;

    const trimmedTitle = renameTitle.trim();
    if (!trimmedTitle) {
      sileo.error({
        title: "Название обязательно",
        description: "Введите название для тир-листа",
        duration: 3000,
      });
      return;
    }

    renameTierList(tierListToRename.id, trimmedTitle);
  }, [tierListToRename, renameTitle, renameTierList]);

  const handleDelete = useCallback(() => {
    if (!tierListToDelete) return;
    removeTierList(tierListToDelete.id);
  }, [tierListToDelete, removeTierList]);

  const handleSetFilterAll = useCallback(() => setFilterOption("all"), [setFilterOption]);
  const handleSetFilterPublic = useCallback(() => setFilterOption("public"), [setFilterOption]);
  const handleSetFilterPrivate = useCallback(() => setFilterOption("private"), [setFilterOption]);
  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) =>
    setSortOption(e.target.value as SortOption), [setSortOption]);
  const handleRetry = useCallback(() => refetch(), [refetch]);
  const handleClearSearch = useCallback(() => setSearchQuery(""), [setSearchQuery]);
  const handleCommunityClick = useCallback(() => navigate("/community"), [navigate]);
  const handleAiLibrarianOpen = useCallback(() => setAiLibrarianOpen(true), []);
  const handleAiLibrarianClose = useCallback(() => setAiLibrarianOpen(false), []);

  const hasSearchQuery = debouncedSearchQuery.trim().length > 0;
  const isEmpty = displayedTierLists.length === 0;
  const hasError = !!error;

  return (
    <DashboardLayout
      onMyRatingsClick={handleMyRatingsClick}
      onSearch={setSearchQuery}
      searchValue={searchQuery}
    >
      <section className="dashboard-home">
        <div className="dashboard-home__container">
          {/* Hero Section */}
          <MemoizedDashboardHeader
            username={user?.username || ""}
            onCreateClick={openCreateModal}
            onCommunityClick={handleCommunityClick}
            onLogoutClick={handleLogout}
          />

          {/* AI Librarian Card — сразу после hero */}
          <div className="mx-auto my-12 max-w-3xl">
            {user?.isPro ? (
              <button
                onClick={handleAiLibrarianOpen}
                className="group flex w-full cursor-pointer items-center gap-5 border-2 border-black bg-[#111111] p-6 text-left shadow-[6px_6px_0_0_#000000] transition-all hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_#000000]"
                type="button"
              >
                <div className="flex size-14 shrink-0 items-center justify-center border-2 border-black bg-[#c1fffe]">
                  <Sparkles className="h-6 w-6 text-black" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black tracking-[-0.02em] text-[#f6f1e8]">
                      ИИ-библиотекарь
                    </span>
                    <span className="rounded border border-[#c1fffe]/30 bg-[#c1fffe]/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-[#c1fffe]">
                      AI
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#9aa1a3]">
                    Я проанализирую твои тир-листы и посоветую книги, которые тебе точно понравятся
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 border-2 border-black bg-[#c1fffe] px-5 py-3 font-black text-black transition-colors group-hover:bg-[#9cf5f3]">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm">Спросить</span>
                </div>
              </button>
            ) : (
              <button
                onClick={() => navigate("/pricing")}
                className="group flex w-full cursor-pointer items-center gap-5 border-2 border-[#2a2818] bg-[#0e0d09] p-6 text-left shadow-[6px_6px_0_0_#000000] transition-all hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_#000000]"
                type="button"
              >
                <div className="flex size-14 shrink-0 items-center justify-center border-2 border-[#554422] bg-[#1a1510]">
                  <Crown className="h-6 w-6 text-[#887744]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black tracking-[-0.02em] text-[#665533]">
                      ИИ-библиотекарь
                    </span>
                    <span className="rounded border border-[#887744]/30 bg-[#887744]/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-[#887744]">
                      PRO
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#554422]">
                    Персональные рекомендации книг на основе твоих тир-листов. Доступно с Pro-подпиской
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 border-2 border-[#554422] bg-[#1a1510] px-5 py-3 font-black text-[#887744] transition-colors group-hover:bg-[#221b10]">
                  <Crown className="h-4 w-4" />
                  <span className="text-sm">Открыть Pro</span>
                </div>
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="dashboard-divider">
            <span>Ваши рейтинги</span>
          </div>

          {/* Sort Controls */}
          <div className="dashboard-controls">
            {/* Filter Tabs */}
            <div className="dashboard-filters">
              <button
                onClick={handleSetFilterAll}
                className={`dashboard-filter-btn ${filterOption === "all" ? "dashboard-filter-btn--active" : ""}`}
              >
                Все
              </button>
              <button
                onClick={handleSetFilterPublic}
                className={`dashboard-filter-btn ${filterOption === "public" ? "dashboard-filter-btn--active" : ""}`}
              >
                Публичные
              </button>
              <button
                onClick={handleSetFilterPrivate}
                className={`dashboard-filter-btn ${filterOption === "private" ? "dashboard-filter-btn--active" : ""}`}
              >
                Приватные
              </button>
            </div>

            {/* Sort Select */}
            <div className="dashboard-sort">
              <select
                value={sortOption}
                onChange={handleSortChange}
                className="dashboard-sort__select"
              >
                <option value="newest">Сначала новые</option>
                <option value="oldest">Сначала старые</option>
                <option value="title-asc">По названию (A-Я)</option>
                <option value="likes">По популярности</option>
              </select>
            </div>
          </div>

          {/* Main content */}
          <MemoizedEmptyStates
            isLoading={isLoading}
            hasError={hasError}
            hasSearchQuery={hasSearchQuery}
            isEmpty={isEmpty && !isLoading}
            onRetry={handleRetry}
            onCreateClick={openCreateModal}
            onClearSearch={handleClearSearch}
            error={error}
          />

          {!isLoading && !hasError && !isEmpty && (
            <>
              <TierListGrid
                tierLists={displayedTierLists}
                onOpen={handleOpenTierList}
                onRename={openRenameModal}
                onDelete={openDeleteModal}
              />

              <MemoizedPagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}

          {/* Stats Section */}
          <MemoizedUserActivityStats
            tierListsCount={tierListsCount}
            publishedCount={publishedCount}
            draftsCount={draftsCount}
            totalBooks={totalBooks}
            likesCount={likesCount}
            lastActivity={lastActivity}
          />

          {/* Recent Public Tier Lists */}
          <MemoizedRecentPublicTierLists />

          {/* Achievements & XP */}
          <DashboardAchievements />

          {/* Trending Now */}
          <TrendingNow />
        </div>
      </section>

      {/* Modals */}
      <CreateTierListModal
        isOpen={activeModal === "create"}
        onClose={closeModal}
        onCreate={handleCreateTierList}
        createTitle={createTitle}
        onTitleChange={setCreateTitle}
        isPending={isCreating}
      />

      <RenameTierListModal
        isOpen={activeModal === "rename"}
        onClose={closeModal}
        onRename={handleRename}
        renameTitle={renameTitle}
        onTitleChange={setRenameTitle}
        isPending={isRenaming}
        tierListTitle={tierListToRename?.title}
      />

      <DeleteTierListModal
        isOpen={activeModal === "delete"}
        onClose={closeModal}
        onDelete={handleDelete}
        tierListTitle={tierListToDelete?.title}
        isPending={isDeleting}
      />

      <AiLibrarianModal
        isOpen={isAiLibrarianOpen}
        onClose={handleAiLibrarianClose}
      />
    </DashboardLayout>
  );
}

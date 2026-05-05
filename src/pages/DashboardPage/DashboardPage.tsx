import { useEffect, useCallback, memo } from "react";
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
import { QuickStartTemplates } from "@/components/DashboardHeroSection/components/QuickStartTemplates";
import { TierListGrid } from "./components/TierListGrid";
import { Pagination } from "@/ui/Pagination";
import { EmptyStates } from "./components/EmptyStates";
import { CreateTierListModal } from "./components/CreateTierListModal";
import { RenameTierListModal } from "./components/RenameTierListModal";
import { DeleteTierListModal } from "./components/DeleteTierListModal";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";
import "./DashboardPage.css";
import logger from "@/lib/logger";


// Мемоизируем компоненты дашборда для предотвращения ререндеров при поиске
const MemoizedDashboardHeader = memo(DashboardHeader);
const MemoizedUserActivityStats = memo(UserActivityStats);
const MemoizedQuickStartTemplates = memo(QuickStartTemplates);
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
    queryKey: ["userStats"],
    queryFn: apiGetUserStats,
    staleTime: 5 * 60 * 1000, // 5 минут
    retry: 2,
  });

  // Вычисляем значения для статистики
  const tierListsCount = stats?.tierListsCount || 0;
  const publishedCount = stats?.likesCount || 0;
  const draftsCount = Math.max(0, tierListsCount - publishedCount);

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
    allTierLists: paginatedResponse.data,
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

          {/* Stats Section */}
          <MemoizedUserActivityStats
            tierListsCount={tierListsCount}
            publishedCount={publishedCount}
            draftsCount={draftsCount}
          />

          {/* Quick Start Templates */}
          <MemoizedQuickStartTemplates />

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
    </DashboardLayout>
  );
}

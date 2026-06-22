import React, { useReducer, useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Lock, Star } from "lucide-react";

import { useAuth } from "@/hooks/useAuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { Spinner } from "@/components/Spinner";
import {
  getUserTierLists,
  getPublicTierLists,
  getLikedTierLists,
  type PaginatedTierListsResponse,
  type TierListShort,
} from "@/lib/tierListApi";
import { Header } from "@/ui/Header";
import { Footer } from "@/ui/Footer";
import { MobileBottomNav } from "@/ui/MobileBottomNav";
import { EmptyState } from "./components/EmptyState";
import {
  templateLibraryReducer,
  initialState,
  type SectionKey,
} from "./templateLibraryReducer";
import { usePublicTierListsPagination } from "./hooks/usePublicTierListsPagination";
import { TemplateLibraryHeader } from "./components/TemplateLibraryHeader";
import { TemplateLibrarySidebar } from "./components/TemplateLibrarySidebar";
import { TemplateLibraryToolbar } from "./components/TemplateLibraryToolbar";
import { PublicTierListsSection } from "./components/PublicTierListsSection";
import PublicTierListCards from "./PublicTierListCards";
import {
  PUBLIC_PAGE_SIZE,
  PUBLIC_TIER_LISTS_STALE_TIME_MS,
  PUBLIC_TIER_LISTS_GC_TIME_MS,
} from "@/constants/pagination";

// Dashboard imports for private section
import { useTierListActions } from "@/pages/DashboardPage/hooks/useTierListActions";
import { useTierListsPagination } from "@/pages/DashboardPage/hooks/useTierListsPagination";
import { TierListGrid } from "@/pages/DashboardPage/components/TierListGrid";
import { EmptyStates } from "@/pages/DashboardPage/components/EmptyStates";
import { CreateTierListModal } from "@/pages/DashboardPage/components/CreateTierListModal";
import { RenameTierListModal } from "@/pages/DashboardPage/components/RenameTierListModal";
import { DeleteTierListModal } from "@/pages/DashboardPage/components/DeleteTierListModal";
import type { SortOption, FilterOption, ModalType } from "@/pages/DashboardPage/types";
import "@/pages/DashboardPage/DashboardPage.css";

const sortBy: "updated_at" | "likes" | "created" = "likes";

const VALID_SECTIONS = new Set<SectionKey>(["private", "public", "favorites"]);

const TemplateLibrary: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();

  const urlSection = searchParams.get("section") as SectionKey | null;
  const defaultSection: SectionKey = isAuthenticated ? "private" : "public";
  const initialSection: SectionKey =
    urlSection && VALID_SECTIONS.has(urlSection) ? urlSection : defaultSection;

  const [state, dispatch] = useReducer(
    templateLibraryReducer,
    null,
    () => ({ ...initialState, activeSection: initialSection }),
  );

  const { activeSection, publicPage } = state;

  // ===== Private section state =====
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [filterOption, setFilterOption] = useState<FilterOption>("all");
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [tierListToRename, setTierListToRename] = useState<TierListShort | null>(null);
  const [tierListToDelete, setTierListToDelete] = useState<TierListShort | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [createTitle, setCreateTitle] = useState("");

  const openCreateModal = useCallback(() => {
    if (!isAuthenticated) {
      navigate("/auth?mode=register");
      return;
    }
    setActiveModal("create");
    setCreateTitle("");
  }, [isAuthenticated, navigate]);

  const openRenameModal = useCallback((tl: TierListShort) => {
    setActiveModal("rename");
    setTierListToRename(tl);
    setRenameTitle(tl.title);
  }, []);

  const openDeleteModal = useCallback((tl: TierListShort) => {
    setActiveModal("delete");
    setTierListToDelete(tl);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setTierListToRename(null);
    setTierListToDelete(null);
    setRenameTitle("");
  }, []);

  // ===== CRUD =====
  const handleCreateSuccess = useCallback((tierListId?: string) => {
    closeModal();
    if (tierListId) {
      navigate(`/tier-lists/${tierListId}`);
    }
  }, [closeModal, navigate]);

  const {
    createNewTierList,
    renameTierList,
    removeTierList,
    isCreating,
    isRenaming,
    isDeleting,
  } = useTierListActions({
    onSuccess: handleCreateSuccess,
    onRefetch: () => {},
  });

  const handleRename = useCallback(() => {
    if (!tierListToRename) return;
    const trimmed = renameTitle.trim();
    if (!trimmed) return;
    renameTierList(tierListToRename.id, trimmed);
  }, [tierListToRename, renameTitle, renameTierList]);

  const handleDelete = useCallback(() => {
    if (!tierListToDelete) return;
    removeTierList(tierListToDelete.id);
  }, [tierListToDelete, removeTierList]);

  // ===== Navigation =====
  const handleGoBack = useCallback(() => navigate("/"), [navigate]);

  const handleSectionChange = useCallback(
    (section: SectionKey) => {
      dispatch({ type: "SET_ACTIVE_SECTION", payload: section });
      setSearchParams(
        section === "private" ? {} : { section },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      dispatch({ type: "SET_PUBLIC_PAGE", payload: page });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [],
  );

  // ===== Data fetching =====
  const {
    data: privateTierListsData,
    isLoading: isLoadingPrivate,
    error: privateError,
  } = useQuery<PaginatedTierListsResponse, Error>({
    queryKey: ["userTierLists"],
    queryFn: () => getUserTierLists(1, 100),
    enabled: activeSection === "private",
    staleTime: PUBLIC_TIER_LISTS_STALE_TIME_MS,
    gcTime: PUBLIC_TIER_LISTS_GC_TIME_MS,
  });

  const {
    data: publicTierListsData,
    isLoading: isLoadingPublicTierLists,
    isFetching: isFetchingPublicTierLists,
  } = useQuery<PaginatedTierListsResponse, Error>({
    queryKey: ["publicTierListsSorted", sortBy, publicPage, PUBLIC_PAGE_SIZE],
    queryFn: () => getPublicTierLists(publicPage, PUBLIC_PAGE_SIZE, sortBy),
    staleTime: PUBLIC_TIER_LISTS_STALE_TIME_MS,
    gcTime: PUBLIC_TIER_LISTS_GC_TIME_MS,
    enabled: activeSection === "public",
  });

  const {
    data: likedTierListsData,
    isLoading: isLoadingLiked,
  } = useQuery<PaginatedTierListsResponse, Error>({
    queryKey: ["likedTierLists"],
    queryFn: () => getLikedTierLists(1, 100),
    enabled: activeSection === "favorites",
    staleTime: PUBLIC_TIER_LISTS_STALE_TIME_MS,
    gcTime: PUBLIC_TIER_LISTS_GC_TIME_MS,
  });

  const { totalPages, hasNextPage, pageNumbers } = usePublicTierListsPagination({
    meta: publicTierListsData?.meta,
    currentPage: publicPage,
  });

  const likedIdsSet = (activeSection === "public" && likedTierListsData?.data)
    ? new Set(likedTierListsData.data.map((tl) => tl.id))
    : new Set<string>();

  const publicTierLists = publicTierListsData?.data || [];

  // Private section search/filter/sort
  const { displayedTierLists } = useTierListsPagination({
    allTierLists: privateTierListsData?.data ?? [],
    searchQuery: debouncedSearchQuery,
    sortOption,
    filterOption,
  });

  const hasSearchQuery = debouncedSearchQuery.trim().length > 0;

  // Handlers
  const handleOpenTierList = useCallback((id: string) => {
    navigate(`/tier-lists/${id}`);
  }, [navigate]);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  const handleClearSearch = useCallback(() => setSearchQuery(""), []);

  const handleSetFilterAll = useCallback(() => setFilterOption("all"), []);
  const handleSetFilterPublic = useCallback(() => setFilterOption("public"), []);
  const handleSetFilterPrivate = useCallback(() => setFilterOption("private"), []);
  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) =>
    setSortOption(e.target.value as SortOption), []);

  // ===== Render =====
  const renderSectionContent = () => {
    switch (activeSection) {
      case "private": {
        if (!isAuthenticated) {
          return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Lock size={48} className="text-cyan-400/40 mb-4" />
              <h3 className="text-xl font-semibold text-[#f3efe6] mb-2">
                Войдите, чтобы управлять тир-листами
              </h3>
              <p className="text-[#b8b1a3] mb-6 max-w-md">
                Создавайте собственные рейтинги книг, делитесь ими и находите единомышленников.
              </p>
              <button
                onClick={() => navigate("/auth?mode=register")}
                className="brutal-cta bg-(--bg-0) text-(--ink-0) px-10 py-4 font-bold uppercase tracking-widest text-xs hover:bg-(--accent-main)"
              >
                Создать аккаунт
              </button>
            </div>
          );
        }

        if (isLoadingPrivate) {
          return (
            <div className="flex items-center justify-center py-12 text-gray-300">
              <Spinner size="md" className="mr-2" />
              Загрузка...
            </div>
          );
        }

        if (privateError) {
          return (
            <EmptyStates
              isLoading={false}
              hasError
              hasSearchQuery={false}
              isEmpty={false}
              onRetry={handleRetry}
              onCreateClick={openCreateModal}
              onClearSearch={handleClearSearch}
              error={privateError}
            />
          );
        }

        const isEmpty = displayedTierLists.length === 0;

        return (
          <>
            {/* Search, Filter, Sort */}
            <div className="dashboard-controls">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 text-gray-400 border border-slate-700/50 transition-all focus-within:ring-2 focus-within:ring-cyan-400/50 focus-within:border-cyan-400/50">
                  <Search size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по названию..."
                    className="bg-transparent border-none outline-none text-sm text-gray-200 placeholder-gray-500 w-36 md:w-48"
                  />
                </div>

                {/* Фильтры: на десктопе — кнопки, на мобиле — select */}
                <div className="hidden md:block">
                  <div className="dashboard-filters">
                    <button
                      onClick={handleSetFilterAll}
                      className={`dashboard-filter-btn ${filterOption === "all" ? "dashboard-filter-btn--active" : ""}`}
                      type="button"
                    >
                      Все
                    </button>
                    <button
                      onClick={handleSetFilterPublic}
                      className={`dashboard-filter-btn ${filterOption === "public" ? "dashboard-filter-btn--active" : ""}`}
                      type="button"
                    >
                      Публичные
                    </button>
                    <button
                      onClick={handleSetFilterPrivate}
                      className={`dashboard-filter-btn ${filterOption === "private" ? "dashboard-filter-btn--active" : ""}`}
                      type="button"
                    >
                      Приватные
                    </button>
                  </div>
                </div>
                <div className="md:hidden">
                  <select
                    value={filterOption}
                    onChange={(e) => setFilterOption(e.target.value as FilterOption)}
                    className="dashboard-sort__select w-full"
                  >
                    <option value="all">Все</option>
                    <option value="public">Публичные</option>
                    <option value="private">Приватные</option>
                  </select>
                </div>
              </div>

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

            <EmptyStates
              isLoading={false}
              hasError={false}
              hasSearchQuery={hasSearchQuery}
              isEmpty={isEmpty}
              onRetry={handleRetry}
              onCreateClick={openCreateModal}
              onClearSearch={handleClearSearch}
            />

            {!isEmpty && (
              <TierListGrid
                tierLists={displayedTierLists}
                onOpen={handleOpenTierList}
                onRename={openRenameModal}
                onDelete={openDeleteModal}
              />
            )}
          </>
        );
      }

      case "public":
        return (
          <PublicTierListsSection
            tierLists={publicTierLists}
            likedIdsSet={likedIdsSet}
            isLoading={isLoadingPublicTierLists}
            isFetching={isFetchingPublicTierLists}
            currentPage={publicPage}
            totalPages={totalPages}
            pageNumbers={pageNumbers}
            hasNextPage={hasNextPage}
            onPageChange={handlePageChange}
          />
        );

      case "favorites": {
        if (!isAuthenticated) {
          return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Star size={48} className="text-cyan-400/40 mb-4" />
              <h3 className="text-xl font-semibold text-[#f3efe6] mb-2">
                Войдите, чтобы увидеть избранное
              </h3>
              <p className="text-[#b8b1a3] mb-6 max-w-md">
                Отмечайте понравившиеся тир-листы лайками, чтобы они появились здесь.
              </p>
              <button
                onClick={() => navigate("/auth?mode=register")}
                className="brutal-cta bg-(--bg-0) text-(--ink-0) px-10 py-4 font-bold uppercase tracking-widest text-xs hover:bg-(--accent-main)"
              >
                Войти
              </button>
            </div>
          );
        }

        if (isLoadingLiked) {
          return (
            <div className="flex items-center justify-center py-12 text-gray-300">
              <Spinner size="md" className="mr-2" />
              Загрузка...
            </div>
          );
        }
        const lists = likedTierListsData?.data || [];
        if (lists.length === 0) {
          return <EmptyState section="favorites" hasSearch={false} />;
        }
        return <PublicTierListCards tierLists={lists} likedIdsSet={new Set(lists.map((tl) => tl.id))} />;
      }
    }
  };

  return (
    <div className="min-h-screen bg-background-dark">
      <Header
        onMyRatingsClick={handleGoBack}
        showTemplatesNav
        activeItem="Библиотека"
      />
      <section className="relative min-h-screen pt-16 pb-16 md:pb-0">
        <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(4,25,38,0.95)_0%,rgba(7,31,43,0.92)_35%,rgba(2,19,32,0.95)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(0,195,255,0.12),transparent_36%),radial-gradient(circle_at_84%_80%,rgba(31,124,158,0.1),transparent_38%)]" />

        <div className="relative px-4 pb-12 pt-8 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <TemplateLibraryHeader
              title="Библиотека"
              description="Тир-листы сообщества и ваши персональные подборки книг."
              onBackClick={handleGoBack}
            />

            {/* Mobile section tabs */}
            <div className="flex lg:hidden items-center gap-1 mb-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {([
                { key: 'private' as const, label: 'Мои' },
                { key: 'public' as const, label: 'Публичные' },
                { key: 'favorites' as const, label: 'Избранное' },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSectionChange(key)}
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    activeSection === key
                      ? 'bg-cyan-500/25 text-cyan-100'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
              <div className="hidden lg:block">
                <TemplateLibrarySidebar
                  activeSection={activeSection}
                  activeCategory="all"
                  categories={[]}
                  onSectionChange={handleSectionChange}
                  onCategoryChange={() => {}}
                />
              </div>

              <div className="w-full min-w-0">
                <TemplateLibraryToolbar
                  activeSection={activeSection}
                  viewMode="compact"
                  onViewModeChange={() => {}}
                  onCreateClick={openCreateModal}
                />

                {renderSectionContent()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modals */}
      <CreateTierListModal
        isOpen={activeModal === "create"}
        onClose={closeModal}
        onCreate={createNewTierList}
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

      <MobileBottomNav showTemplatesNav />
      <Footer />
    </div>
  );
};

export default TemplateLibrary;

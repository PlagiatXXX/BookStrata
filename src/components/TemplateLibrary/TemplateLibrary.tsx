import React, { useReducer, useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";

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
  useAuth();

  const urlSection = searchParams.get("section") as SectionKey | null;
  const initialSection: SectionKey =
    urlSection && VALID_SECTIONS.has(urlSection) ? urlSection : "private";

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
    setActiveModal("create");
    setCreateTitle("");
  }, []);

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
  const {
    createNewTierList,
    renameTierList,
    removeTierList,
    isCreating,
    isRenaming,
    isDeleting,
  } = useTierListActions({
    onSuccess: closeModal,
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
                    className="bg-transparent border-none outline-none text-sm text-gray-200 placeholder-gray-500 w-48"
                  />
                </div>

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
      <section className="relative min-h-screen pt-16">
        <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(4,25,38,0.95)_0%,rgba(7,31,43,0.92)_35%,rgba(2,19,32,0.95)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(0,195,255,0.12),transparent_36%),radial-gradient(circle_at_84%_80%,rgba(31,124,158,0.1),transparent_38%)]" />

        <div className="relative px-4 pb-12 pt-8 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <TemplateLibraryHeader
              title="Библиотека"
              description="Тир-листы сообщества и ваши персональные подборки книг."
              onBackClick={handleGoBack}
            />

            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
              <TemplateLibrarySidebar
                activeSection={activeSection}
                activeCategory="all"
                categories={[]}
                onSectionChange={handleSectionChange}
                onCategoryChange={() => {}}
              />

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

      <Footer />
    </div>
  );
};

export default TemplateLibrary;

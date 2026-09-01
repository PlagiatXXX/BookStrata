import React, { useReducer, useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Lock, Star } from "lucide-react";

import { SEOHead } from "@/components/SEO/SEOHead";
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

// Page-specific styles (gold theme, Playfair Display)
import "./templates-page.css";

const sortBy: "updated_at" | "likes" | "created" = "likes";

const VALID_SECTIONS = new Set<SectionKey>(["private", "public", "favorites", "new"]);

const SECTION_LABELS_MOBILE: Record<SectionKey, string> = {
  private: "Мои",
  public: "Популярные",
  new: "Новинки",
  favorites: "Избранное",
};

const TemplateLibrary: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();

  const urlSection = searchParams.get("section") as SectionKey | null;
  const urlPage = Number(searchParams.get("page")) || 1;
  const defaultSection: SectionKey = isAuthenticated ? "private" : "public";
  const initialSection: SectionKey =
    urlSection && VALID_SECTIONS.has(urlSection) ? urlSection : defaultSection;

  const [state, dispatch] = useReducer(
    templateLibraryReducer,
    null,
    () => ({
      ...initialState,
      activeSection: initialSection,
      publicPage: initialSection === 'public' ? urlPage : 1,
    }),
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
      navigate("/auth?mode=register&redirect=/templates");
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
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (page > 1) { next.set("page", String(page)); } else { next.delete("page"); }
        return next;
      }, { replace: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setSearchParams],
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
    staleTime: 0,
    gcTime: PUBLIC_TIER_LISTS_GC_TIME_MS,
    enabled: activeSection === "public",
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // При пререндере не делаем запросы, требующие авторизации
  const isPrerender = typeof window !== 'undefined' && window.__PRERENDER__ === true;

  const {
    data: likedTierListsData,
    isLoading: isLoadingLiked,
  } = useQuery<PaginatedTierListsResponse, Error>({
    queryKey: ["likedTierLists"],
    queryFn: () => getLikedTierLists(1, 100),
    enabled: activeSection === "favorites" && !isPrerender,
    staleTime: PUBLIC_TIER_LISTS_STALE_TIME_MS,
    gcTime: PUBLIC_TIER_LISTS_GC_TIME_MS,
  });

  // Новинки — публичные тир-листы за последнюю неделю
  const {
    data: newTierListsData,
    isLoading: isLoadingNew,
  } = useQuery<PaginatedTierListsResponse, Error>({
    queryKey: ["newTierLists"],
    queryFn: () => getPublicTierLists(1, 50, 'created'),
    staleTime: 0,
    gcTime: PUBLIC_TIER_LISTS_GC_TIME_MS,
    enabled: activeSection === "new",
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Фильтруем за последнюю неделю
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const newTierLists = (newTierListsData?.data || []).filter((tl) => {
    const created = new Date(tl.createdAt);
    return created >= oneWeekAgo;
  });

  const { hasNextPage, pageNumbers } = usePublicTierListsPagination({
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
            <div className="tpl-empty">
              <Lock size={48} />
              <h3>Войдите, чтобы управлять тир-листами</h3>
              <p>
                Создавайте собственные рейтинги книг, делитесь ими и находите единомышленников.
              </p>
              <button
                onClick={() => navigate("/auth?mode=register&redirect=/templates")}
                className="tpl-empty-btn"
              >
                Создать аккаунт
              </button>
            </div>
          );
        }

        if (isLoadingPrivate) {
          return (
            <div className="tpl-loading">
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
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 text-gray-400 border border-slate-700/50 transition-all focus-within:ring-2 focus-within:ring-[var(--tpl-primary)]/50 focus-within:border-[var(--tpl-primary)]/50">
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
            pageNumbers={pageNumbers}
            hasNextPage={hasNextPage}
            onPageChange={handlePageChange}
          />
        );

      case "new": {
        if (isLoadingNew) {
          return (
            <div className="tpl-loading">
              <Spinner size="md" className="mr-2" />
              Загрузка...
            </div>
          );
        }
        if (newTierLists.length === 0) {
          return (
            <div className="tpl-empty">
              <Star size={48} />
              <h3>Новинок пока нет</h3>
              <p>За последнюю неделю не было создано ни одного тир-листа.</p>
            </div>
          );
        }
        return <PublicTierListCards tierLists={newTierLists} likedIdsSet={new Set()} />;
      }

      case "favorites": {
        if (!isAuthenticated) {
          return (
            <div className="tpl-empty">
              <Star size={48} />
              <h3>Войдите, чтобы увидеть избранное</h3>
              <p>
                Отмечайте понравившиеся тир-листы лайками, чтобы они появились здесь.
              </p>
              <button
                onClick={() => navigate("/auth?mode=register&redirect=/templates")}
                className="tpl-empty-btn"
              >
                Войти
              </button>
            </div>
          );
        }

        if (isLoadingLiked) {
          return (
            <div className="tpl-loading">
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
    <div className="templates-page">
      <SEOHead
        title="Тир-листы книг — рейтинги и визуальные подборки"
        description="Тир-листы BookStrata — рейтинги книг по жанрам, настроению и темам. Создавайте и публикуйте собственные подборки, находите вдохновение в работах сообщества."
        url="/templates"
        breadcrumbs={[
          { name: "Главная", url: "/" },
          { name: "Тир-листы", url: "/templates" },
        ]}
      />
      <Header
        onMyRatingsClick={handleGoBack}
        showTemplatesNav
        activeItem="Тир-листы"
      />
      <main className="tpl-main">
        <TemplateLibraryHeader
          title="Тир-листы"
          description="Коллекция тир-листов сообщества BookStrata."
        />

        {/* Mobile section tabs */}
        <div className="tpl-mobile-tabs">
          {([
            { key: 'private' as const },
            { key: 'public' as const },
            { key: 'new' as const },
            { key: 'favorites' as const },
          ]).map(({ key }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSectionChange(key)}
              className={`tpl-mobile-tab ${activeSection === key ? 'tpl-mobile-tab--active' : ''}`}
            >
              {SECTION_LABELS_MOBILE[key]}
            </button>
          ))}
        </div>

        <div className="tpl-layout">
          <div className="hidden lg:block">
            <TemplateLibrarySidebar
              activeSection={activeSection}
              activeCategory="all"
              categories={[]}
              onSectionChange={handleSectionChange}
              onCategoryChange={() => {}}
              onCreateClick={openCreateModal}
            />
          </div>

          <div className="flex-1 min-w-0">
            {activeSection === "public" && (
              <div className="tpl-section-header">
                <h2 className="tpl-heading-section">Популярные</h2>
                <span className="tpl-section-header__right">Избранное сообщества</span>
              </div>
            )}

            {renderSectionContent()}
          </div>
        </div>
      </main>

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

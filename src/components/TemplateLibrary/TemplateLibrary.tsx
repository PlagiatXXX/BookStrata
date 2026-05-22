import React, { useReducer, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "@/hooks/useAuthContext";
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
import { Pagination } from "@/ui/Pagination";
import {
  PUBLIC_PAGE_SIZE,
  PUBLIC_TIER_LISTS_STALE_TIME_MS,
  PUBLIC_TIER_LISTS_GC_TIME_MS,
} from "@/constants/pagination";

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

  const handleGoBack = useCallback(() => navigate("/"), [navigate]);

  const handleSectionChange = useCallback(
    (section: SectionKey) => {
      dispatch({ type: "SET_ACTIVE_SECTION", payload: section });
      // Сохраняем секцию в URL, чтобы фокус не сбрасывался
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
      // Прокрутка вверх при смене страницы
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [],
  );

  // ===== Запрос для личных тир-листов =====
  const {
    data: privateTierListsData,
    isLoading: isLoadingPrivate,
  } = useQuery<PaginatedTierListsResponse, Error>({
    queryKey: ["privateTierLists"],
    queryFn: () => getUserTierLists(1, 100),
    enabled: activeSection === "private",
    staleTime: PUBLIC_TIER_LISTS_STALE_TIME_MS,
    gcTime: PUBLIC_TIER_LISTS_GC_TIME_MS,
  });

  // ===== Запрос для публичных тир-листов =====
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

  // ===== Запрос для лайкнутых тир-листов =====
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

  // Хук пагинации для public секции
  const { totalPages, hasNextPage, pageNumbers } = usePublicTierListsPagination(
    {
      meta: publicTierListsData?.meta,
      currentPage: publicPage,
    },
  );

  // likedIdsSet для подсветки лайкнутых в public секции
  const likedIdsSet = useMemo(() => {
    if (activeSection === "public" && likedTierListsData?.data) {
      return new Set(likedTierListsData.data.map((tl) => tl.id));
    }
    return new Set<string>();
  }, [activeSection, likedTierListsData?.data]);

  const publicTierLists = publicTierListsData?.data || [];

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
        const lists = privateTierListsData?.data || [];
        if (lists.length === 0) {
          return <EmptyState section="private" hasSearch={false} />;
        }
        return <PublicTierListCards tierLists={lists} likedIdsSet={new Set()} />;
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
        activeItem="Шаблоны"
      />
      <section className="relative min-h-screen pt-16">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(4,25,38,0.95)_0%,rgba(7,31,43,0.92)_35%,rgba(2,19,32,0.95)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(0,195,255,0.12),transparent_36%),radial-gradient(circle_at_84%_80%,rgba(31,124,158,0.1),transparent_38%)]" />

        <div className="relative px-4 pb-12 pt-8 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {/* Header */}
            <TemplateLibraryHeader
              title="Библиотека"
              description="Тир-листы сообщества и ваши персональные подборки книг."
              onBackClick={handleGoBack}
            />

            {/* Main content */}
            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
              {/* Sidebar */}
              <TemplateLibrarySidebar
                activeSection={activeSection}
                activeCategory="all"
                categories={[]}
                onSectionChange={handleSectionChange}
                onCategoryChange={() => {}}
              />

              {/* Main content area */}
              <div className="w-full min-w-0">
                {/* Toolbar */}
                <TemplateLibraryToolbar
                  activeSection={activeSection}
                  viewMode="compact"
                  onViewModeChange={() => {}}
                  onCreateClick={() => navigate("/")}
                />

                {/* Content */}
                {renderSectionContent()}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default TemplateLibrary;
